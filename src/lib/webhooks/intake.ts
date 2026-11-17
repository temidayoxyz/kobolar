import { db } from '@/lib/db'
import { providerEvent } from '@/lib/db/schema'
import { enqueue } from '@/lib/jobs'
import { getProvider } from '@/lib/providers'
import type { ProviderId } from '@/lib/providers/types'

/**
 * Shared webhook intake. Verify on the raw body, persist with a unique key,
 * respond immediately, and do all real work in the queue.
 */
export async function receiveProviderWebhook(providerId: ProviderId, request: Request) {
  const rawBody = await request.text()
  const provider = await getProvider()
  if (provider.id !== providerId) {
    return { ok: false, status: 400, error: `Active provider is ${provider.id}, not ${providerId}` }
  }

  let event
  try {
    event = await provider.verifyWebhook(rawBody, request.headers)
  } catch (error) {
    return {
      ok: false,
      status: 400,
      error: error instanceof Error ? error.message : 'Invalid webhook signature',
    }
  }

  const inserted = await db
    .insert(providerEvent)
    .values({
      provider: providerId,
      eventId: event.eventId,
      eventType: event.type,
      payload: event.raw,
      status: 'pending',
    })
    .onConflictDoNothing()
    .returning({ id: providerEvent.id })

  if (inserted.length > 0) {
    await enqueue('process.provider.event', { eventRowId: inserted[0]!.id })
  }

  return { ok: true, status: 200, duplicate: inserted.length === 0 }
}
