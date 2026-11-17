import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { price, product } from '@/lib/db/schema'
import { listProductsWithPrices } from '@/lib/billing/products'

const schema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  amount: z.string().regex(/^\d+(\.\d{1,4})?$/),
  currency: z.string().min(3).max(3).default('NGN'),
  type: z.enum(['one_time', 'recurring']).default('one_time'),
  interval: z.enum(['month', 'year']).optional(),
  providerPlanId: z.string().optional(),
})

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ products: await listProductsWithPrices() })
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid product', details: parsed.error.flatten() }, { status: 422 })
  }

  const body = parsed.data
  const created = await db.transaction(async (tx) => {
    const [productRow] = await tx.insert(product).values({
      name: body.name,
      description: body.description,
    }).returning()
    const [priceRow] = await tx.insert(price).values({
      productId: productRow!.id,
      type: body.type,
      interval: body.type === 'recurring' ? (body.interval ?? 'month') : null,
      amount: body.amount,
      currency: body.currency.toUpperCase(),
      providerPlanId: body.providerPlanId,
    }).returning()
    return { product: productRow, price: priceRow }
  })

  return NextResponse.json(created, { status: 201 })
}
