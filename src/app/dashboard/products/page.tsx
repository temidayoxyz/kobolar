import { AdminShell } from '@/components/admin/AdminShell'
import { ProductList } from '@/components/dashboard/ProductList'
import { listProductsWithPrices } from '@/lib/billing/products'

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  const products = await listProductsWithPrices()
  const rows = products.map((row) => ({
    product: {
      id: row.product.id,
      name: row.product.name,
      description: row.product.description,
      active: row.product.active,
    },
    price: row.price
      ? {
          id: row.price.id,
          amount: row.price.amount,
          currency: row.price.currency,
          type: row.price.type,
          interval: row.price.interval,
        }
      : null,
  }))

  return (
    <AdminShell title="Products">
      <ProductList initial={rows} />
    </AdminShell>
  )
}
