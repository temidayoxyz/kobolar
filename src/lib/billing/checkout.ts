import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { checkout, price, product } from '@/lib/db/schema'
import { getProvider } from '@/lib/providers'
import type { CreateCheckoutInput } from '@/lib/providers/types'

export class CheckoutError extends Error {}

export async function createCheckout(input: {
  priceId: string
  customerEmail: string
  customerName?: string
  successUrl?: string
  cancelUrl?: string
  metadata?: Record<string, string>
}) {
  const [priceRow] = await db.select().from(price).where(eq(price.id, input.priceId)).limit(1)
  if (!priceRow || !priceRow.active) throw new CheckoutError('Price is not available')

  const [productRow] = await db.select().from(product).where(eq(product.id, priceRow.productId)).limit(1)
  if (!productRow || !productRow.active) throw new CheckoutError('Product is not available')

  const reference = `kbo_${crypto.randomUUID().replace(/-/g, '')}`
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const provider = await getProvider()

  const providerInput: CreateCheckoutInput = {
    reference,
    amount: priceRow.amount,
    currency: priceRow.currency,
    description: productRow.name,
    customerEmail: input.customerEmail,
    customerName: input.customerName,
    successUrl: input.successUrl ?? `${appUrl}/checkout/${reference}/success`,
    cancelUrl: input.cancelUrl ?? `${appUrl}/checkout/${reference}/cancel`,
    metadata: { ...input.metadata, product_id: productRow.id, price_id: priceRow.id },
    recurring: priceRow.type === 'recurring'
      ? { interval: (priceRow.interval as 'month' | 'year') ?? 'month', planId: priceRow.providerPlanId ?? undefined }
      : undefined,
  }

  const session = await provider.createCheckout(providerInput)

  const [row] = await db
    .insert(checkout)
    .values({
      reference,
      productId: productRow.id,
      priceId: priceRow.id,
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      status: 'open',
      provider: provider.id,
      providerSessionId: session.providerSessionId,
      providerUrl: session.checkoutUrl,
      amount: priceRow.amount,
      currency: priceRow.currency,
      metadata: input.metadata ?? {},
    })
    .returning()

  return row
}

export async function getCheckoutByReference(reference: string) {
  const [row] = await db.select().from(checkout).where(eq(checkout.reference, reference)).limit(1)
  return row
}
