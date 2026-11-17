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
import { extractPayment, type ExtractedPayment } from '@/lib/providers/normalize'
import { enqueue } from '@/lib/jobs'

/**
 * Fulfil a verified provider event. Safe to call repeatedly: the checkout
 * status guard and the unique payment reference prevent double-fulfilment.
 */
export async function fulfillPaymentEvent(
  event: ProviderEvent,
  options: { skipRemoteVerification?: boolean } = {},
) {
  // Demo mode exists so the full order/invoice/receipt path can be exercised
  // locally without a provider webhook reaching localhost. It is hard-disabled
  // in production and always only touches the local database.
  if (options.skipRemoteVerification) {
    if (process.env.NODE_ENV === 'production' || process.env.DEMO_MODE !== 'true') {
      throw new Error('Demo fulfilment is disabled')
    }
  }

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
  if (extracted.providerReference && !options.skipRemoteVerification) {
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
