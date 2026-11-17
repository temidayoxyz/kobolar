import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/db/schema'

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

/**
 * Portable, DB-backed fixed-window rate limiter. Works on every deployment
 * target because it uses the same Postgres as the rest of the app — no
 * in-process state and no extra service.
 *
 * Note: a fixed window allows up to 2× the limit across a window boundary.
 * That is acceptable for abuse prevention on auth/checkout endpoints.
 */
export async function checkRateLimit(options: {
  key: string
  max: number
  windowSeconds: number
}): Promise<RateLimitResult> {
  const windowMs = options.windowSeconds * 1000
  const bucket = Math.floor(Date.now() / windowMs)
  const key = `${options.key}:${bucket}`

  const rows = await db
    .insert(rateLimit)
    .values({ key, count: 1, windowEnd: new Date(Date.now() + windowMs) })
    .onConflictDoUpdate({
      target: rateLimit.key,
      set: { count: sql`${rateLimit.count} + 1` },
    })
    .returning({ count: rateLimit.count })

  const count = rows[0]?.count ?? 1
  return {
    allowed: count <= options.max,
    remaining: Math.max(0, options.max - count),
    retryAfterSeconds: options.windowSeconds,
  }
}

/** Extract a best-effort client IP from proxy headers. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim()
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}

/** Remove expired buckets. Called by the cron tick to bound table growth. */
export async function pruneRateLimits() {
  await db.delete(rateLimit).where(sql`${rateLimit.windowEnd} < now()`)
}
