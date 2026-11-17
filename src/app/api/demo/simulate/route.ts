import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { checkout, price } from '@/lib/db/schema'
import { fulfillPaymentEvent } from '@/lib/billing/fulfillment'
import { applySubscriptionEvent } from '@/lib/billing/subscriptions'
import { processJobs } from '@/lib/jobs'
import { registerJobHandlers } from '@/lib/jobs/handlers'
import { createPortalToken } from '@/lib/portal/token'

registerJobHandlers()

const schema = z.object({ reference: z.string().min(1) })

/**
 * LOCAL DEMO ONLY. Simulates a provider webhook for a checkout created in this
 * installation, exercising the real order/invoice/receipt code paths. Disabled
 * in production and when DEMO_MODE is not explicitly 'true'.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production' || process.env.DEMO_MODE !== 'true') {
    return NextResponse.json({ error: 'Demo mode is disabled' }, { status: 404 })
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 422 })

  const [row] = await db.select().from(checkout).where(eq(checkout.reference, parsed.data.reference)).limit(1)
  if (!row) return NextResponse.json({ error: 'Checkout not found' }, { status: 404 })

  const [priceRow] = await db.select().from(price).where(eq(price.id, row.priceId)).limit(1)
  const isRecurring = priceRow?.type === 'recurring'

  const baseEvent = {
    provider: row.provider as 'bachs' | 'paystack' | 'flutterwave',
    eventId: `evt_demo_${crypto.randomUUID()}`,
    createdAt: new Date(),
    data: {
      reference: row.reference,
      checkout_id: row.providerSessionId ?? undefined,
      charge_id: `ch_demo_${row.reference}`,
      amount: row.amount,
      currency: row.currency,
      status: 'SUCCEEDED',
      id: `sub_demo_${row.reference}`,
    },
    raw: { demo: true },
  }

  // 1) Fulfil payment → order + payment + invoice + receipt job.
  const payment = await fulfillPaymentEvent(
    { ...baseEvent, type: 'collection.succeeded' },
    { skipRemoteVerification: true },
  )

  // 2) For recurring products, simulate the subscription-created event.
  let subscriptionResult: unknown = null
  if (isRecurring) {
    subscriptionResult = await applySubscriptionEvent({
      ...baseEvent,
      type: 'customer.subscription.created',
      data: {
        ...baseEvent.data,
        status: 'active',
        demo: true,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      },
    })
  }

  // 3) Drain queued jobs (receipt email, notifications) so the demo is instant.
  const processed = await processJobs(20)

  const portalToken = row.customerEmail ? await createPortalTokenByEmail(row.customerEmail) : null

  return NextResponse.json({
    payment,
    subscription: subscriptionResult,
    jobsProcessed: processed,
    portalUrl: portalToken ? `/portal/${portalToken}` : null,
  })
}

async function createPortalTokenByEmail(email: string) {
  const { customer } = await import('@/lib/db/schema')
  const [row] = await db.select().from(customer).where(eq(customer.email, email)).limit(1)
  if (!row) return null
  return createPortalToken(row.id)
}
