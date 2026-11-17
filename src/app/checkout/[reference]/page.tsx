import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { price, product } from '@/lib/db/schema'
import { getCheckoutByReference } from '@/lib/billing/checkout'
import { format } from '@/lib/money'
import { CheckoutForm } from './checkout-form'

export default async function CheckoutPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params
  const existing = await getCheckoutByReference(reference)
  if (existing) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
        <div className="rounded-xl border border-border bg-card p-8 shadow-md">
          <h1 className="font-display text-2xl font-semibold">Complete your payment</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your checkout is ready. Continue to our secure payment provider.
          </p>
          <a
            href={existing.providerUrl ?? '#'}
            className="mt-6 block rounded-lg bg-primary px-4 py-3 text-center text-sm font-medium text-primary-foreground"
          >
            Continue to payment →
          </a>
        </div>
      </main>
    )
  }

  // Public checkout links are created by the business without a priceId in the
  // URL; show the product picker form instead.
  const products = await db
    .select({ product, price })
    .from(product)
    .innerJoin(price, eq(price.productId, product.id))
    .where(eq(product.active, true))

  if (products.length === 0) notFound()

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
      <div className="rounded-xl border border-border bg-card p-8 shadow-md">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Secure checkout</p>
        <h1 className="mt-2 font-display text-2xl font-semibold">Choose your purchase</h1>
        <CheckoutForm
          options={products.map((row) => ({
            priceId: row.price.id,
            label: `${row.product.name} — ${format(row.price.amount, row.price.currency)}`,
          }))}
        />
      </div>
    </main>
  )
}
