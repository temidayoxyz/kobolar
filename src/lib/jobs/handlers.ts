import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { providerEvent } from '@/lib/db/schema'
import { registerJob } from '@/lib/jobs'
import { fulfillPaymentEvent } from '@/lib/billing/fulfillment'
import { applySubscriptionEvent } from '@/lib/billing/subscriptions'
import { sendEmail } from '@/lib/email'
import { customer, subscription } from '@/lib/db/schema'

/** Register all job handlers. Imported once at application startup. */
export function registerJobHandlers() {
  registerJob('process.provider.event', async (payload) => {
    const eventRowId = payload.eventRowId as string
    const [row] = await db.select().from(providerEvent).where(eq(providerEvent.id, eventRowId)).limit(1)
    if (!row || row.status !== 'pending') return

    const event = {
      provider: row.provider as 'bachs' | 'paystack' | 'flutterwave',
      eventId: row.eventId,
      type: row.eventType,
      createdAt: row.receivedAt,
      data: (row.payload.data as Record<string, unknown>) ?? row.payload,
      raw: row.payload,
    }

    // Subscription lifecycle events are handled separately from payments.
    const isSubscriptionEvent =
      event.type.startsWith('customer.subscription.') ||
      event.type.startsWith('subscription.')
    const result = isSubscriptionEvent
      ? await applySubscriptionEvent(event)
      : await fulfillPaymentEvent(event)

    const ok =
      ('fulfilled' in result && result.fulfilled === true) ||
      ('applied' in result && result.applied === true) ||
      ('duplicate' in result && result.duplicate === true)
    await db
      .update(providerEvent)
      .set({
        status: ok ? 'processed' : 'failed',
        lastError: ok ? null : String(result.reason),
        processedAt: new Date(),
        attempts: row.attempts + 1,
      })
      .where(eq(providerEvent.id, eventRowId))
  })

  registerJob('subscription.notify.payment.failed', async (payload) => {
    const [sub] = await db.select().from(subscription).where(eq(subscription.id, payload.subscriptionId as string)).limit(1)
    if (!sub) return
    const [cust] = await db.select().from(customer).where(eq(customer.id, sub.customerId)).limit(1)
    if (!cust) return
    await sendEmail({
      to: cust.email,
      subject: 'A subscription payment needs your attention',
      html: '<p>We could not process your latest subscription payment. Please update your payment method with the provider to keep your subscription active.</p>',
      text: 'Your subscription payment failed. Please update your payment method.',
    })
  })

  registerJob('subscription.notify.canceled', async (payload) => {
    const [sub] = await db.select().from(subscription).where(eq(subscription.id, payload.subscriptionId as string)).limit(1)
    if (!sub) return
    const [cust] = await db.select().from(customer).where(eq(customer.id, sub.customerId)).limit(1)
    if (!cust) return
    await sendEmail({
      to: cust.email,
      subject: 'Your subscription has been cancelled',
      html: '<p>Your subscription is now cancelled. You will not be charged again.</p>',
      text: 'Your subscription has been cancelled.',
    })
  })

  registerJob('send.receipt.email', async (payload) => {
    await sendEmail({
      to: payload.email as string,
      subject: `Your receipt ${payload.invoiceNumber}`,
      html: `<p>Thank you for your payment.</p><p>Invoice: <strong>${payload.invoiceNumber}</strong></p><p>Amount: ${payload.amount} ${payload.currency}</p>`,
      text: `Invoice ${payload.invoiceNumber} — ${payload.amount} ${payload.currency}`,
    })
  })
}
