import { hmacHex, timingSafeEqual } from '@/lib/providers/shared'

const SECRET = process.env.BETTER_AUTH_SECRET ?? 'dev-only-secret-change-me-before-production-000001'
const TTL_SECONDS = 60 * 60 * 24 * 30

function base64urlEncode(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded)
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)))
}

/** Signed, expiring portal token. Customers never need a Kobolar account. */
export async function createPortalToken(customerId: string): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + TTL_SECONDS
  const payload = `${customerId}.${expiresAt}`
  const signature = (await hmacHex(SECRET, payload)).slice(0, 32)
  return `${base64urlEncode(payload)}.${signature}`
}

export async function verifyPortalToken(token: string): Promise<string | null> {
  const [encoded, signature] = token.split('.')
  if (!encoded || !signature) return null
  let payload: string
  try {
    payload = base64urlDecode(encoded)
  } catch {
    return null
  }
  const [customerId, expires] = payload.split('.')
  if (!customerId || !expires || !/^\d+$/.test(expires)) return null
  if (Number(expires) < Math.floor(Date.now() / 1000)) return null

  const expected = (await hmacHex(SECRET, payload)).slice(0, 32)
  if (!timingSafeEqual(signature, expected)) return null
  return customerId
}
