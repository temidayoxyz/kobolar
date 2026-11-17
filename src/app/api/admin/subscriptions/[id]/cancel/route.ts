import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { cancelSubscription } from '@/lib/billing/subscriptions'

const schema = z.object({
  atPeriodEnd: z.boolean().default(true),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 422 })

  try {
    const result = await cancelSubscription(id, parsed.data)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cancellation failed' },
      { status: 400 },
    )
  }
}
