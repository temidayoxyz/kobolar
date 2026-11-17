import { NextResponse } from 'next/server'
import { assertRuntimeEnv } from '@/lib/env'
import { applySecurityHeaders } from '@/lib/security/headers'

/** Liveness/readiness probe. Also surfaces production misconfiguration. */
export function GET() {
  const response = NextResponse.json({ status: 'ok' })
  applySecurityHeaders(response)

  if (process.env.NODE_ENV === 'production') {
    try {
      assertRuntimeEnv()
    } catch {
      return NextResponse.json(
        { status: 'misconfigured', message: 'Required environment variables are missing or weak' },
        { status: 503 },
      )
    }
  }
  return response
}
