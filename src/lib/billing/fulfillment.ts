import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  business,
  checkout,
  customer,
  invoice,
  order,
  orderItem,
  payment,
  product,
} from '@/lib/db/schema'
import { getProvider } from '@/lib/providers'
import type { ProviderEvent } from '@/lib/providers/types'
import { enqueue } from '@/lib/jobs'

type ExtractedPayment = {
  reference?: string
  providerSessionId?: string
  providerReference?: string
  status: 'pending' | 'succeeded' | 'failed'
  amount?: string
  currency?: string
}

/** Provider-specific event normalization. Keep provider knowledge out of the
 * billing engine: each known event maps to a small, uniform payment shape. */
function extractPayment(event: ProviderEvent): ExtractedPayment {
  const data = event.data as Record<string, unknown>
  const string = (value: unknown) => (typeof value === 'string' ? value : value == null ? undefined : String(value))

  if (event.provider === 'bachs') {
    const succeeded = event.type === 'collection.succeeded' || event.type === 'checkout.completed'
    return {
      reference: string(data.reference),
      providerSessionId: string(data.checkout_id),
      providerReference: string(data.charge_id),
      status: succeeded ? 'succeeded' : event.type === 'collection.failed' ? 'failed' : 'pending',
      amount: string(data.amount),
      currency: string(data.currency),
    }
  }

  if (event.provider === 'paystack') {
    const status = string(data.status)
    return {
      reference: string(data.reference),
      providerReference: string(data.reference),
      status: event.type === 'charge.success' || status === 'success' ? 'succeeded' : status === 'failed' ? 'failed' : 'pending',
      amount: string(data.amount),
      currency: string(data.currency),
    }
  }

  if (event.provider === 'flutterwave') {
    const status = string(data.status)
    return {
      reference: string(data.tx_ref),
      providerReference: string(data.id),
      status: event.type === 'charge.completed' && status === 'successful' ? 'succeeded' : status === 'failed' ? 'failed' : 'pending',
      amount: string(data.amount),
      currency: string(data.currency),
    }
  }

  return { status: 'pending' }
}

/**
 * Fulfil a verified provider event. Safe to call repeatedly: the checkout
 * status guard and the unique payment reference prevent double-fulfilment.
 */
export async function fulfillPaymentEvent(event: ProviderEvent) {
  const extracted = extractPayment(event)
  if (extracted.status !== 'succeeded') return { fulfilled: false, reason: 'not a success event' }

  const [row] = extracted.reference
    ? await db.select().from(checkout).where(eq(checkout.reference, extracted.reference)).limit(1)
    : extracted.providerSessionId
      ? await db.select().from(checkout).where(eq(checkout.providerSessionId, extracted.providerSessionId)).limit(1)
      : []

  if (!row) return { fulfilled: false, reason: 'checkout not found' }
  if (row.status === 'completed') return { fulfilled: false, reason: 'already fulfilled', duplicate: true }

  // Server-side verification: never trust a webhook or redirect alone.
  const provider = await getProvider()
  let verified = extracted as ExtractedPayment & { source: 'event' | 'provider' }
  if (extracted.providerReference) {
    try {
      const remote = await provider.getPayment(extracted.providerReference)
      if (remote.status !== 'succeeded') return { fulfilled: false, reason: 'provider reports payment not successful' }
      verified = { ...extracted, amount: remote.amount, currency: remote.currency, source: 'provider' }
    } catch {
      return { fulfilled: false, reason: 'provider verification failed' }
    }
  }

  return db.transaction(async (tx) => {
    const [biz] = await tx.select().from(business).limit(1)
    if (!biz) throw new Error('Business not configured')

    const [next] = await tx
      .update(business)
      .set({ nextInvoiceNumber: sql`${business.nextInvoiceNumber} + 1` })
      .returning({ nextInvoiceNumber: business.nextInvoiceNumber })

    // Find or create customer.
    let customerRow = (await tx.select().from(customer).where(eq(customer.email, row.customerEmail ?? 'unknown@example.com')).limit(1))[0]
    if (!customerRow) {
      customerRow = (await tx.insert(customer).values({
        email: row.customerEmail ?? 'unknown@example.com',
        name: row.customerName,
      }).returning())[0]!
    }

    const sequence = next.nextInvoiceNumber
    const orderNumber = `${biz.invoicePrefix}-${String(sequence).padStart(6, '0')}`
    const invoiceNumber = `INV-${String(sequence).padStart(6, '0')}`
    const amount = verified.amount ?? row.amount
    const currency = verified.currency ?? row.currency

    const orderRow = (await tx.insert(order).values({
      number: orderNumber,
      customerId: customerRow.id,
      checkoutId: row.id,
      status: 'paid',
      subtotal: amount,
      total: amount,
      currency,
    }).returning())[0]!

    const [productRow] = await tx.select().from(product).where(eq(product.id, row.productId)).limit(1)
    await tx.insert(orderItem).values({
      orderId: orderRow.id,
      productId: row.productId,
      description: productRow?.name ?? 'Product',
      quantity: 1,
      unitAmount: amount,
      amount,
    })

    const paymentRows = await tx.insert(payment).values({
      orderId: orderRow.id,
      customerId: customerRow.id,
      provider: row.provider,
      providerReference: verified.providerReference ?? row.providerSessionId ?? row.reference,
      status: 'succeeded',
      amount,
      currency,
      paidAt: new Date(),
      rawPayload: event.raw,
    }).onConflictDoNothing().returning({ id: payment.id })

    if (paymentRows.length === 0) {
      return { fulfilled: false, reason: 'payment already recorded', duplicate: true }
    }

    await tx.insert(invoice).values({
      orderId: orderRow.id,
      customerId: customerRow.id,
      number: invoiceNumber,
      status: 'paid',
      amount,
      currency,
      issuedAt: new Date(),
    })

    await tx.update(checkout).set({ status: 'completed' }).where(and(eq(checkout.id, row.id), eq(checkout.status, 'open')))

    await enqueue('send.receipt.email', {
      email: customerRow.email,
      orderId: orderRow.id,
      invoiceNumber,
      amount,
      currency,
    })

    return { fulfilled: true, orderId: orderRow.id, invoiceNumber, verifiedFrom: verified.source }
  })
}
