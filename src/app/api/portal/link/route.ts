import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { customer } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createPortalToken } from '@/lib/portal/token'
import { checkRateLimit, clientIp } from '@/lib/security/rate-limit'

/** Admin-only: create a magic link that gives a customer portal access. */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limit = await checkRateLimit({
    key: `portal-link:${clientIp(request)}`,
    max: 20,
    windowSeconds: 60,
  })
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    )
  }

  const body = (await request.json()) as { customerId?: string; email?: string }
  let customerId = body.customerId

  if (!customerId && body.email) {
    const [row] = await db.select().from(customer).where(eq(customer.email, body.email)).limit(1)
    customerId = row?.id
  }
  if (!customerId) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  const token = await createPortalToken(customerId)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return NextResponse.json({ url: `${appUrl}/portal/${token}` })
}
