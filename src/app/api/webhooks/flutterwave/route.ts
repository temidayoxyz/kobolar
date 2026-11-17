import { NextResponse } from 'next/server'
import { receiveProviderWebhook } from '@/lib/webhooks/intake'

export async function POST(request: Request) {
  const result = await receiveProviderWebhook('flutterwave', request)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ received: true, duplicate: result.duplicate })
}
