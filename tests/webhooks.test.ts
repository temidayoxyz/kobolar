import { describe, expect, it } from 'vitest'
import { bachsProvider } from '../src/lib/providers/bachs'
import { flutterwaveProvider } from '../src/lib/providers/flutterwave'
import { hmacHex, timingSafeEqual } from '../src/lib/providers/shared'

const SECRET = 'whsec_test_secret_1234567890'

describe('provider capabilities', () => {
  it('declares Bachs native recurring', () => {
    const provider = bachsProvider({ apiKey: 'sk_sandbox_test', webhookSecret: SECRET })
    expect(provider.capabilities.recurring).toContain('native')
    expect(provider.capabilities.hostedCheckout).toBe(true)
  })

  it('declares Flutterwave native and tokenized recurring', () => {
    const provider = flutterwaveProvider({ secretKey: 'flw_test', webhookSecret: SECRET })
    expect(provider.capabilities.recurring).toContain('native')
    expect(provider.capabilities.recurring).toContain('tokenized')
  })
})

describe('webhook signature verification', () => {
  it('accepts a valid Bachs V2 signature', async () => {
    const rawBody = '{"id":"evt_1","type":"collection.succeeded"}'
    const timestamp = String(Math.floor(Date.now() / 1000))
    const signature = await hmacHex(SECRET, `${timestamp}.${rawBody}`)
    const headers = new Headers({
      'X-Bachs-Signature-V2': `t=${timestamp},v1=${signature}`,
    })
    const provider = bachsProvider({ apiKey: 'sk_sandbox_test', webhookSecret: SECRET })
    const event = await provider.verifyWebhook(rawBody, headers)
    expect(event.eventId).toBe('evt_1')
    expect(event.type).toBe('collection.succeeded')
  })

  it('rejects a tampered Bachs signature', async () => {
    const rawBody = '{"id":"evt_1"}'
    const timestamp = String(Math.floor(Date.now() / 1000))
    const headers = new Headers({
      'X-Bachs-Signature-V2': `t=${timestamp},v1=deadbeef`,
    })
    const provider = bachsProvider({ apiKey: 'sk_sandbox_test', webhookSecret: SECRET })
    await expect(provider.verifyWebhook(rawBody, headers)).rejects.toThrow()
  })

  it('accepts the Flutterwave verif-hash header', async () => {
    const provider = flutterwaveProvider({ secretKey: 'flw_test', webhookSecret: SECRET })
    const headers = new Headers({ 'verif-hash': SECRET })
    const event = await provider.verifyWebhook('{"event":"charge.completed","data":{"id":1}}', headers)
    expect(event.type).toBe('charge.completed')
    expect(event.eventId).toBe('charge.completed:1')
  })

  it('rejects a missing Flutterwave hash', async () => {
    const provider = flutterwaveProvider({ secretKey: 'flw_test', webhookSecret: SECRET })
    await expect(provider.verifyWebhook('{}', new Headers())).rejects.toThrow()
  })

  it('compares secrets in constant time', () => {
    expect(timingSafeEqual(SECRET, SECRET)).toBe(true)
    expect(timingSafeEqual(SECRET, 'wrong')).toBe(false)
  })
})
