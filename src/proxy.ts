import { NextResponse, type NextRequest } from 'next/server'
import { SECURITY_HEADERS } from '@/lib/security/headers'

/**
 * Edge proxy: applies security headers to every response.
 * Auth checks live in the route handlers themselves (Defense in Depth) because
 * Edge middleware cannot query the Postgres-backed BetterAuth database.
 */
export function proxy(request: NextRequest) {
  const response = NextResponse.next()
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value)
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
