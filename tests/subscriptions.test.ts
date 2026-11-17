import { describe, expect, it } from 'vitest'
import { hmacHex } from '../src/lib/providers/shared'
import { flutterwaveProvider } from '../src/lib/providers/flutterwave'

describe('subscription capabilities by provider', () => {
  it('all three providers declare native recurring', async () => {
    const { bachsProvider } = await import('../src/lib/providers/bachs')
    const { paystackProvider } = await import('../src/lib/providers/paystack')
    const secret = 'whsec_test_1234567890'

    expect(bachsProvider({ apiKey: 'sk_sandbox_x', webhookSecret: secret }).capabilities.recurring).toContain('native')
    expect(paystackProvider({ secretKey: 'sk_test_x', webhookSecret: secret }).capabilities.recurring).toContain('native')
    expect(flutterwaveProvider({ secretKey: 'flw_x', webhookSecret: secret }).capabilities.recurring).toContain('native')
  })

  it('Flutterwave also declares tokenized recurring', () => {
    const provider = flutterwaveProvider({ secretKey: 'flw_x', webhookSecret: 'secret' })
    expect(provider.capabilities.recurring).toContain('tokenized')
    expect(provider.createPlan).toBeDefined()
  })
})

describe('subscription webhook shapes', () => {
  it('verifies a Flutterwave cancellation event', async () => {
    const secret = 'secret_hash'
    const provider = flutterwaveProvider({ secretKey: 'flw_x', webhookSecret: secret })
    const payload = JSON.stringify({
      event: 'subscription.cancelled',
      data: { status: 'deactivated', plan: { id: 10944 } },
    })
    const event = await provider.verifyWebhook(payload, new Headers({ 'verif-hash': secret }))
    expect(event.type).toBe('subscription.cancelled')
    expect((event.data as { plan: { id: number } }).plan.id).toBe(10944)
  })

  it('computes Paystack-style HMAC-SHA512 signatures', async () => {
    const signature = await hmacHex('secret', '{"event":"charge.success"}', 'SHA-512')
    expect(signature).toMatch(/^[0-9a-f]{128}$/)
  })
})
