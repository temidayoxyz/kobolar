import { describe, expect, it } from 'vitest'
import { clientIp } from '../src/lib/security/rate-limit'

describe('client IP extraction', () => {
  it('uses the first forwarded address', () => {
    const request = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    })
    expect(clientIp(request)).toBe('1.2.3.4')
  })

  it('falls back to Cloudflare connecting IP', () => {
    const request = new Request('https://example.com', {
      headers: { 'cf-connecting-ip': '9.8.7.6' },
    })
    expect(clientIp(request)).toBe('9.8.7.6')
  })

  it('uses unknown when no headers are present', () => {
    const request = new Request('https://example.com')
    expect(clientIp(request)).toBe('unknown')
  })
})
