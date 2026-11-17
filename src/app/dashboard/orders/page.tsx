import { AdminShell } from '@/components/admin/AdminShell'
import { DataTable as Table } from '@/components/dashboard/DataTable'
import { db } from '@/lib/db'
import { customer, order } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'
import { format } from '@/lib/money'

export const dynamic = 'force-dynamic'

type Row = { number: string; customer: string | null; total: string; currency: string; status: string; createdAt: Date }

export default async function OrdersPage() {
  const rows = await db
    .select({ order, customerEmail: customer.email })
    .from(order)
    .leftJoin(customer, eq(customer.id, order.customerId))
    .orderBy(desc(order.createdAt))

  const data: Row[] = rows.map((r) => ({
    number: r.order.number,
    customer: r.customerEmail,
    total: r.order.total,
    currency: r.order.currency,
    status: r.order.status,
    createdAt: r.order.createdAt,
  }))

  return (
    <AdminShell title="Orders">
      <Table<Row>
        rows={data}
        empty="No orders yet. Orders appear when a payment is verified."
        columns={[
          { key: 'number', header: 'Order', render: (r) => <span className="font-mono">{r.number}</span> },
          { key: 'customer', header: 'Customer', render: (r) => r.customer ?? '—' },
          { key: 'total', header: 'Total', render: (r) => format(r.total, r.currency) },
          { key: 'status', header: 'Status', render: (r) => <span className="capitalize">{r.status}</span> },
          { key: 'created', header: 'Date', render: (r) => new Date(r.createdAt).toLocaleDateString() },
        ]}
      />
    </AdminShell>
  )
}
