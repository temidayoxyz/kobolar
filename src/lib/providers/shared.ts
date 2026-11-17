/** Server-only helpers shared by provider adapters. Uses Web Crypto so the
 * same code runs on Node, Vercel, Netlify and Cloudflare Workers. */

export class ProviderError extends Error {
  constructor(message: string, readonly status: number = 500) {
    super(message)
    this.name = 'ProviderError'
  }
}

export async function providerFetch(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: unknown; idempotencyKey?: string },
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: 'no-store',
  })

  const text = await response.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  if (!response.ok) {
    throw new ProviderError(
      `Provider request failed (${response.status}): ${typeof data === 'string' ? data : JSON.stringify(data)}`,
      response.status,
    )
  }
  return data
}

export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const aa = enc.encode(a)
  const bb = enc.encode(b)
  if (aa.length !== bb.length) return false
  let diff = 0
  for (let i = 0; i < aa.length; i++) diff |= aa[i]! ^ bb[i]!
  return diff === 0
}

export async function hmacHex(secret: string, message: string, algorithm: 'SHA-256' | 'SHA-512' = 'SHA-256') {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: algorithm },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/** Paystack minor units (kobo) → canonical decimal string. */
export function minorToDecimal(minor: number | string): string {
  const value = typeof minor === 'string' ? Number(minor) : minor
  return (value / 100).toFixed(2)
}

/** Canonical decimal string → Paystack minor units. */
export function decimalToMinor(amount: string): number {
  return Math.round(Number(amount) * 100)
}
