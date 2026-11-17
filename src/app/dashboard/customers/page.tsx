import { AdminShell } from '@/components/admin/AdminShell'
import { DataTable } from '@/components/dashboard/DataTable'
import { db } from '@/lib/db'
import { customer } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

type Row = { id: string; email: string; name: string | null; createdAt: Date }

export default async function CustomersPage() {
  const rows: Row[] = await db.select({
    id: customer.id, email: customer.email, name: customer.name, createdAt: customer.createdAt,
  }).from(customer).orderBy(desc(customer.createdAt))

  return (
    <AdminShell title="Customers">
      <DataTable<Row>
        rows={rows}
        empty="No customers yet. They are created automatically at checkout."
        columns={[
          { key: 'name', header: 'Name', render: (r) => r.name ?? '—' },
          { key: 'email', header: 'Email', render: (r) => r.email },
          { key: 'created', header: 'Created', render: (r) => new Date(r.createdAt).toLocaleDateString() },
        ]}
      />
    </AdminShell>
  )
}
