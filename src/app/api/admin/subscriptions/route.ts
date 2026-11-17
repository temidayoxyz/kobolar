import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { customer, subscription } from '@/lib/db/schema'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db
    .select({ subscription, customerEmail: customer.email, customerName: customer.name })
    .from(subscription)
    .leftJoin(customer, eq(customer.id, subscription.customerId))
    .orderBy(desc(subscription.createdAt))

  return NextResponse.json({ subscriptions: rows })
}
