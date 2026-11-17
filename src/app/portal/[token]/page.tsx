import { desc, eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { customer, invoice, order, subscription } from '@/lib/db/schema'
import { verifyPortalToken } from '@/lib/portal/token'
import { format } from '@/lib/money'
import { CancelSubscriptionButton } from './cancel-button'

export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const customerId = await verifyPortalToken(token)
  if (!customerId) notFound()

  const [customerRow] = await db.select().from(customer).where(eq(customer.id, customerId)).limit(1)
  if (!customerRow) notFound()

  const orders = await db.select().from(order).where(eq(order.customerId, customerId)).orderBy(desc(order.createdAt))
  const invoices = await db.select().from(invoice).where(eq(invoice.customerId, customerId)).orderBy(desc(invoice.createdAt))
  const subscriptions = await db.select().from(subscription).where(eq(subscription.customerId, customerId))

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Customer portal</p>
      <h1 className="mt-2 font-display text-3xl font-semibold">Hello, {customerRow.name ?? customerRow.email}</h1>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">Purchases</h2>
        <div className="mt-4 space-y-2">
          {orders.length === 0 && <p className="text-sm text-muted-foreground">No purchases yet.</p>}
          {orders.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
              <div>
                <p className="text-sm font-medium">{item.number}</p>
                <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{format(item.total, item.currency)}</p>
                <p className="text-xs capitalize text-muted-foreground">{item.status}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">Invoices</h2>
        <div className="mt-4 space-y-2">
          {invoices.length === 0 && <p className="text-sm text-muted-foreground">No invoices yet.</p>}
          {invoices.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
              <span className="text-sm font-medium">{doc.number}</span>
              <a
                href={`/api/customer-portal/invoices/${doc.id}/pdf?token=${encodeURIComponent(token)}`}
                className="text-xs font-medium underline"
              >
                Download PDF
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">Subscriptions</h2>
        <div className="mt-4 space-y-2">
          {subscriptions.length === 0 && <p className="text-sm text-muted-foreground">No subscriptions yet.</p>}
          {subscriptions.map((sub) => (
            <div key={sub.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
              <div>
                <p className="text-sm font-medium capitalize">{sub.status}</p>
                <p className="text-xs text-muted-foreground">
                  {sub.cancelAtPeriodEnd
                    ? 'Cancels at end of period'
                    : sub.currentPeriodEnd
                      ? `Renews ${new Date(sub.currentPeriodEnd).toLocaleDateString()}`
                      : '—'}
                </p>
              </div>
              {!sub.cancelAtPeriodEnd && sub.status !== 'canceled' && (
                <CancelSubscriptionButton subscriptionId={sub.id} token={token} />
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
