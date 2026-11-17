import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { providerEvent } from '@/lib/db/schema'
import { registerJob } from '@/lib/jobs'

/** Register all job handlers. Imported once at application startup. */
export function registerJobHandlers() {
  registerJob('process.provider.event', async (payload) => {
    const eventRowId = payload.eventRowId as string
    const [row] = await db.select().from(providerEvent).where(eq(providerEvent.id, eventRowId)).limit(1)
    if (!row || row.status !== 'pending') return

    // Domain processing (checkout completion, order creation, subscription
    // updates) is implemented in Phase 3–4. The event is durably stored here
    // and retried by the queue if processing fails.
    await db
      .update(providerEvent)
      .set({ status: 'processed', processedAt: new Date(), attempts: row.attempts + 1 })
      .where(eq(providerEvent.id, eventRowId))
  })
}
