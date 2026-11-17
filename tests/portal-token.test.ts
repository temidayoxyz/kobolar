import { describe, expect, it } from 'vitest'
import { createPortalToken, verifyPortalToken } from '../src/lib/portal/token'

describe('customer portal tokens', () => {
  it('round-trips a customer id', async () => {
    const token = await createPortalToken('cust_123')
    expect(await verifyPortalToken(token)).toBe('cust_123')
  })

  it('rejects a tampered token', async () => {
    const token = await createPortalToken('cust_123')
    const tampered = `${token.slice(0, -1)}x`
    expect(await verifyPortalToken(tampered)).toBeNull()
  })

  it('rejects a malformed token', async () => {
    expect(await verifyPortalToken('not-a-token')).toBeNull()
  })
})
