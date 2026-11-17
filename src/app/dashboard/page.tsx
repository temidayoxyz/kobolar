import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { AdminShell } from '@/components/admin/AdminShell'
import { db } from '@/lib/db'
import { customer, order, product, subscription } from '@/lib/db/schema'

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  const [products] = await db.select().from(product).limit(1)
  const allOrders = await db.select().from(order)
  const allCustomers = await db.select().from(customer)
  const allSubscriptions = await db.select().from(subscription)
  const revenue = allOrders
    .filter((o) => o.status === 'paid')
    .reduce((sum, o) => sum + Number(o.total), 0)

  const stats = [
    { label: 'Total revenue', value: revenue.toLocaleString() },
    { label: 'Orders', value: String(allOrders.length) },
    { label: 'Customers', value: String(allCustomers.length) },
    { label: 'Subscriptions', value: String(allSubscriptions.length) },
  ]

  return (
    <AdminShell title="Overview">
      <p className="text-muted-foreground">Welcome back, {session?.user.name ?? 'there'}.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
            <p className="mt-2 font-display text-2xl font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>
      {!products && (
        <div className="mt-8 rounded-xl border border-dashed border-border p-8 text-center">
          <p className="font-medium">Get started by creating your first product</p>
          <p className="mt-1 text-sm text-muted-foreground">Products and prices are managed on the Products page.</p>
        </div>
      )}
    </AdminShell>
  )
}
