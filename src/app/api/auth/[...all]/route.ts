import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { checkRateLimit, clientIp } from '@/lib/security/rate-limit'

/** BetterAuth handler wrapped with a coarse IP-based rate limit. BetterAuth
 * also applies its own per-route rules (configured in src/lib/auth/index.ts). */
async function handler(request: Request) {
  const limit = await checkRateLimit({
    key: `auth:${clientIp(request)}`,
    max: 30,
    windowSeconds: 60,
  })
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: { 'Retry-After': String(limit.retryAfterSeconds) },
      },
    )
  }
  return auth.handler(request)
}

export { handler as GET, handler as POST }
