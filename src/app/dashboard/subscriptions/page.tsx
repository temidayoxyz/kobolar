import { AdminShell } from '@/components/admin/AdminShell'
import { DataTable } from '@/components/dashboard/DataTable'
import { db } from '@/lib/db'
import { customer, subscription } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

type Row = {
  id: string
  customer: string | null
  status: string
  periodEnd: Date | null
  cancelAtPeriodEnd: boolean
}

export default async function SubscriptionsPage() {
  const rows = await db
    .select({ subscription, customerEmail: customer.email })
    .from(subscription)
    .leftJoin(customer, eq(customer.id, subscription.customerId))
    .orderBy(desc(subscription.createdAt))

  const data: Row[] = rows.map((r) => ({
    id: r.subscription.id,
    customer: r.customerEmail,
    status: r.subscription.status,
    periodEnd: r.subscription.currentPeriodEnd,
    cancelAtPeriodEnd: r.subscription.cancelAtPeriodEnd,
  }))

  return (
    <AdminShell title="Subscriptions">
      <DataTable<Row>
        rows={data}
        empty="No subscriptions yet. Recurring products create subscriptions at checkout."
        columns={[
          { key: 'customer', header: 'Customer', render: (r) => r.customer ?? '—' },
          { key: 'status', header: 'Status', render: (r) => <span className="capitalize">{r.status}</span> },
          {
            key: 'renews', header: 'Renews / ends', render: (r) =>
              r.cancelAtPeriodEnd ? 'Ends at period end'
                : r.periodEnd ? new Date(r.periodEnd).toLocaleDateString() : '—',
          },
        ]}
      />
    </AdminShell>
  )
}
