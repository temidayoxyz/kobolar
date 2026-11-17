import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { price, product } from '@/lib/db/schema'

export async function listProducts() {
  return db.select().from(product).orderBy(desc(product.createdAt))
}

export async function listProductsWithPrices() {
  const rows = await db
    .select({ product, price })
    .from(product)
    .leftJoin(price, eq(price.productId, product.id))
    .orderBy(desc(product.createdAt))
  return rows
}

export async function listCustomers() {
  const { customer } = await import('@/lib/db/schema')
  return db.select().from(customer).orderBy(desc(customer.createdAt))
}
