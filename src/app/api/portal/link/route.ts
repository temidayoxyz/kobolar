import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { customer } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createPortalToken } from '@/lib/portal/token'

/** Admin-only: create a magic link that gives a customer portal access. */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
