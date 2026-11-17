import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { subscription } from '@/lib/db/schema'
import { verifyPortalToken } from '@/lib/portal/token'
import { cancelSubscription } from '@/lib/billing/subscriptions'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = new URL(request.url).searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 })
  const { id } = await params

  const [sub] = await db.select().from(subscription).where(eq(subscription.id, id)).limit(1)
  if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const customerId = await verifyPortalToken(token)
  if (!customerId || customerId !== sub.customerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (sub.cancelAtPeriodEnd || sub.status === 'canceled') {
    return NextResponse.json({ error: 'Already cancelled' }, { status: 400 })
  }

  try {
    const result = await cancelSubscription(id, { atPeriodEnd: true })
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cancellation failed' },
      { status: 400 },
    )
  }
}
