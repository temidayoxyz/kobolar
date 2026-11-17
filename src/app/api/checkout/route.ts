import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createCheckout, CheckoutError } from '@/lib/billing/checkout'
import { checkRateLimit, clientIp } from '@/lib/security/rate-limit'

const schema = z.object({
  priceId: z.string().uuid(),
  customerEmail: z.string().email(),
  customerName: z.string().min(1).max(200).optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
})

export async function POST(request: Request) {
  const limit = await checkRateLimit({
    key: `checkout:${clientIp(request)}`,
    max: 10,
    windowSeconds: 60,
  })
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    )
  }

  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid checkout input', details: parsed.error.flatten() }, { status: 422 })
  }

  try {
    const checkout = await createCheckout(parsed.data)
    return NextResponse.json({ checkoutUrl: checkout.providerUrl, reference: checkout.reference })
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Unable to create checkout' }, { status: 500 })
  }
}
