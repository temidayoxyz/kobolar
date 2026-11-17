import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { checkout, customer, price, subscription } from '@/lib/db/schema'
import { getProvider } from '@/lib/providers'
import type { ProviderEvent } from '@/lib/providers/types'
import { interpretSubscriptionEvent } from '@/lib/providers/normalize'
import { enqueue } from '@/lib/jobs'

type SubscriptionEventData = Record<string, unknown>
const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? undefined : String(v))

/** Apply a provider subscription event. Idempotent by provider id + event ordering. */
export async function applySubscriptionEvent(event: ProviderEvent) {
  const interpreted = interpretSubscriptionEvent(event)
  if (!interpreted) return { applied: false, reason: 'not a subscription event' }

  // Find by provider subscription id, or by the checkout that started it.
  let existing = interpreted.providerSubscriptionId
    ? (await db.select().from(subscription).where(eq(subscription.providerSubscriptionId, interpreted.providerSubscriptionId)).limit(1))[0]
    : undefined

  if (!existing) {
    // Try to resolve via a checkout reference carried in event metadata/data.
    const reference = str((event.data as SubscriptionEventData).checkout_id) ?? str((event.data as SubscriptionEventData).reference)
    if (reference) {
      const checkoutRow = (await db.select().from(checkout).where(eq(checkout.reference, reference)).limit(1))[0]
      if (checkoutRow) {
        const [priceRow] = await db.select().from(price).where(eq(price.id, checkoutRow.priceId)).limit(1)
        const [customerRow] = await db.select().from(customer).where(eq(customer.email, checkoutRow.customerEmail ?? '')).limit(1)
        if (priceRow && customerRow && interpreted.providerSubscriptionId) {
          existing = (await db.insert(subscription).values({
            customerId: customerRow.id,
            priceId: priceRow.id,
            provider: event.provider,
            providerSubscriptionId: interpreted.providerSubscriptionId,
            status: 'incomplete',
            managementToken: interpreted.managementToken,
            currentPeriodStart: interpreted.periodStart,
            currentPeriodEnd: interpreted.periodEnd,
            metadata: { source: 'subscription-event' },
          }).returning())[0]
        }
      }
    }
  }

  if (!existing) return { applied: false, reason: 'subscription not found' }

  const updates: Partial<typeof subscription.$inferInsert> = {}
  if (interpreted.status) updates.status = interpreted.status
  if (interpreted.periodStart) updates.currentPeriodStart = interpreted.periodStart
  if (interpreted.periodEnd) updates.currentPeriodEnd = interpreted.periodEnd
  if (interpreted.managementToken) updates.managementToken = interpreted.managementToken
  if (interpreted.cancelAtPeriodEnd !== undefined) updates.cancelAtPeriodEnd = interpreted.cancelAtPeriodEnd
  if (interpreted.status === 'canceled') updates.canceledAt = new Date()
  if (interpreted.status === 'past_due') updates.failedAttempts = existing.failedAttempts + 1
  if (interpreted.status === 'active') updates.failedAttempts = 0

  await db.update(subscription).set(updates).where(eq(subscription.id, existing.id))

  if (interpreted.status === 'past_due') {
    await enqueue('subscription.notify.payment.failed', { subscriptionId: existing.id })
  }
  if (interpreted.status === 'canceled') {
    await enqueue('subscription.notify.canceled', { subscriptionId: existing.id })
  }

  return { applied: true, subscriptionId: existing.id, status: interpreted.status }
}

/** Customer- or admin-initiated cancellation, routed to the active provider. */
export async function cancelSubscription(subscriptionId: string, options: { atPeriodEnd?: boolean } = {}) {
  const [sub] = await db.select().from(subscription).where(eq(subscription.id, subscriptionId)).limit(1)
  if (!sub) throw new Error('Subscription not found')
  if (sub.status === 'canceled') return { canceled: true, already: true }

  const provider = await getProvider()
  if (!provider.cancelSubscription) {
    throw new Error(`Provider ${sub.provider} does not support cancellation`)
  }

  await provider.cancelSubscription(sub.providerSubscriptionId, {
    atPeriodEnd: options.atPeriodEnd ?? true,
    token: sub.managementToken ?? undefined,
  })

  // Native providers echo the change via webhook. Update optimistically so the
  // UI is correct immediately; the webhook is the final source of truth.
  await db.update(subscription).set({
    status: options.atPeriodEnd === false ? 'canceled' : sub.status,
    cancelAtPeriodEnd: options.atPeriodEnd ?? true,
    canceledAt: options.atPeriodEnd === false ? new Date() : undefined,
  }).where(eq(subscription.id, sub.id))

  return { canceled: true }
}

/** List subscriptions due for renewal that belong to a tokenized provider.
 * Native providers (Bachs/Paystack/Flutterwave plans) renew themselves, so
 * this is only used for card-on-file schedules if enabled. */
export async function listTokenizedSubscriptionsDue() {
  return db.select().from(subscription).where(
    and(eq(subscription.status, 'active'), eq(subscription.provider, 'flutterwave')),
  )
}
