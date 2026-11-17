import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { jobQueue } from '@/lib/db/schema'

type JobHandler = (payload: Record<string, unknown>) => Promise<void>

const handlers = new Map<string, JobHandler>()

export function registerJob(name: string, handler: JobHandler) {
  handlers.set(name, handler)
}

export async function enqueue(
  name: string,
  payload: Record<string, unknown> = {},
  options: { runAt?: Date; maxAttempts?: number } = {},
) {
  const [job] = await db
    .insert(jobQueue)
    .values({
      name,
      payload,
      runAt: options.runAt ?? new Date(),
      maxAttempts: options.maxAttempts ?? 5,
    })
    .returning({ id: jobQueue.id })
  return job.id
}

/**
 * Claims a single pending job atomically. Multiple concurrent invocations
 * (cron tick plus a platform queue) can never process the same job twice.
 */
export async function claimNext() {
  const result = await db.execute(sql`
    UPDATE job_queue
    SET status = 'processing', locked_at = now()
    WHERE id = (
      SELECT id FROM job_queue
      WHERE status = 'pending' AND run_at <= now() AND locked_at IS NULL
      ORDER BY run_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING id
  `)
  // postgres.js returns rows directly; other drivers wrap them in `.rows`.
  const rows = Array.isArray(result)
    ? result
    : ((result as { rows?: unknown[] }).rows ?? [])
  const id = (rows[0] as { id?: string } | undefined)?.id
  if (!id) return null

  const [job] = await db.select().from(jobQueue).where(eq(jobQueue.id, id)).limit(1)
  return job ?? null
}

export async function completeJob(id: string) {
  await db
    .update(jobQueue)
    .set({ status: 'completed', completedAt: new Date(), lockedAt: null })
    .where(eq(jobQueue.id, id))
}

export async function failJob(id: string, error: string, attempts: number, maxAttempts: number) {
  const failed = attempts + 1 >= maxAttempts
  await db
    .update(jobQueue)
    .set({
      status: failed ? 'failed' : 'pending',
      attempts: attempts + 1,
      lastError: error,
      lockedAt: null,
      runAt: failed ? new Date() : new Date(Date.now() + 2 ** attempts * 1000),
    })
    .where(eq(jobQueue.id, id))
}

export async function processJobs(limit = 10) {
  let processed = 0
  for (let i = 0; i < limit; i++) {
    const job = await claimNext()
    if (!job) break

    const handler = handlers.get(job.name)
    if (!handler) {
      await failJob(job.id, `No handler registered for "${job.name}"`, job.attempts, job.maxAttempts)
      continue
    }

    try {
      await handler(job.payload)
      await completeJob(job.id)
      processed++
    } catch (error) {
      await failJob(
        job.id,
        error instanceof Error ? error.message : String(error),
        job.attempts,
        job.maxAttempts,
      )
    }
  }
  return processed
}

export type { JobHandler }
