import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { providerEvent } from '@/lib/db/schema'
import { registerJob } from '@/lib/jobs'
import { fulfillPaymentEvent } from '@/lib/billing/fulfillment'
import { sendEmail } from '@/lib/email'

/** Register all job handlers. Imported once at application startup. */
export function registerJobHandlers() {
  registerJob('process.provider.event', async (payload) => {
    const eventRowId = payload.eventRowId as string
    const [row] = await db.select().from(providerEvent).where(eq(providerEvent.id, eventRowId)).limit(1)
    if (!row || row.status !== 'pending') return

    const result = await fulfillPaymentEvent({
      provider: row.provider as 'bachs' | 'paystack' | 'flutterwave',
      eventId: row.eventId,
      type: row.eventType,
      createdAt: row.receivedAt,
      data: row.payload.data as Record<string, unknown> ?? row.payload,
      raw: row.payload,
    })

    const ok = result.fulfilled || ('duplicate' in result && result.duplicate === true)
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

  registerJob('send.receipt.email', async (payload) => {
    await sendEmail({
      to: payload.email as string,
      subject: `Your receipt ${payload.invoiceNumber}`,
      html: `<p>Thank you for your payment.</p><p>Invoice: <strong>${payload.invoiceNumber}</strong></p><p>Amount: ${payload.amount} ${payload.currency}</p>`,
      text: `Invoice ${payload.invoiceNumber} — ${payload.amount} ${payload.currency}`,
    })
  })
}
