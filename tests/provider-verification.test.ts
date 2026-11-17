import { describe, expect, it } from 'vitest'
import { bachsProvider } from '../src/lib/providers/bachs'
import { flutterwaveProvider } from '../src/lib/providers/flutterwave'
import { paystackProvider } from '../src/lib/providers/paystack'
import { extractPayment, interpretSubscriptionEvent } from '../src/lib/providers/normalize'
import { FIXED_TIMESTAMP, fixtures } from '../src/lib/providers/fixtures'
import { hmacHex } from '../src/lib/providers/shared'
import type { PaymentProvider, ProviderEvent } from '../src/lib/providers/types'

function adapterFor(provider: string, secret: string): PaymentProvider {
  if (provider === 'bachs') return bachsProvider({ apiKey: 'sk_sandbox_verify', webhookSecret: secret })
  if (provider === 'paystack') return paystackProvider({ secretKey: 'sk_test_verify', webhookSecret: secret })
  return flutterwaveProvider({ secretKey: 'flw_verify', webhookSecret: secret })
}

async function signedHeaders(fixture: (typeof fixtures)[number], body: string): Promise<Headers> {
  const headers = new Headers()
  if (fixture.provider === 'bachs') {
    const sig = await hmacHex(fixture.secret, `${FIXED_TIMESTAMP}.${body}`)
    headers.set('X-Bachs-Signature-V2', `t=${FIXED_TIMESTAMP},v1=${sig}`)
  } else if (fixture.provider === 'paystack') {
    const sig = await hmacHex(fixture.secret, body, 'SHA-512')
    headers.set('x-paystack-signature', sig)
  } else {
    headers.set('verif-hash', fixture.secret)
  }
  return headers
}

/** Sign each fixture exactly as the provider would, then verify through the
 * real adapter. This is the offline half of the sandbox verification harness. */
describe('provider webhook verification against documented fixtures', () => {
  for (const fixture of fixtures) {
    it(`${fixture.provider}: verifies signature and normalizes ${fixture.name}`, async () => {
      const headers = await signedHeaders(fixture, fixture.rawBody)
      const adapter = adapterFor(fixture.provider, fixture.secret)
      const event: ProviderEvent = await adapter.verifyWebhook(fixture.rawBody, headers)

      expect(event.provider).toBe(fixture.provider)
      expect(event.type).toBe(fixture.expectedType)

      const payment = extractPayment(event)
      expect(payment.status).toBe('succeeded')
      expect(payment.amount).toBeDefined()
      expect(payment.currency).toBeDefined()
    })
  }

  it('Bachs rejects a tampered body (signature covers raw body)', async () => {
    const fixture = fixtures.find((f) => f.provider === 'bachs')!
    const headers = await signedHeaders(fixture, fixture.rawBody)
    const adapter = adapterFor('bachs', fixture.secret)
    const tampered = fixture.rawBody.replace('29.00', '99.00')
    await expect(adapter.verifyWebhook(tampered, headers)).rejects.toThrow()
  })

  it('Paystack rejects a tampered body (HMAC-SHA512 covers raw body)', async () => {
    const fixture = fixtures.find((f) => f.provider === 'paystack')!
    const headers = await signedHeaders(fixture, fixture.rawBody)
    const adapter = adapterFor('paystack', fixture.secret)
    const tampered = fixture.rawBody.replace('290000', '990000')
    await expect(adapter.verifyWebhook(tampered, headers)).rejects.toThrow()
  })

  it('Flutterwave rejects a wrong verif-hash (shared secret model)', async () => {
    const fixture = fixtures.find((f) => f.provider === 'flutterwave')!
    const adapter = adapterFor('flutterwave', fixture.secret)
    const headers = new Headers({ 'verif-hash': 'wrong-secret' })
    await expect(adapter.verifyWebhook(fixture.rawBody, headers)).rejects.toThrow()
  })
})

describe('subscription event normalization against documented fixtures', () => {
  it('Bachs customer.subscription.deleted maps to canceled', () => {
    const event: ProviderEvent = {
      provider: 'bachs', eventId: 'evt_sub', type: 'customer.subscription.deleted',
      createdAt: new Date(), data: { id: 'sub_1', status: 'canceled' }, raw: {},
    }
    expect(interpretSubscriptionEvent(event)?.status).toBe('canceled')
  })

  it('Paystack subscription.create exposes the management token', () => {
    const event: ProviderEvent = {
      provider: 'paystack', eventId: 'sub_1', type: 'subscription.create',
      createdAt: new Date(),
      data: { subscription_code: 'SUB_vsyq', email_token: 'd7gofp6yppn3qz7', status: 'active' },
      raw: {},
    }
    const result = interpretSubscriptionEvent(event)
    expect(result?.status).toBe('active')
    expect(result?.managementToken).toBe('d7gofp6yppn3qz7')
  })

  it('Flutterwave subscription.cancelled maps to canceled', () => {
    const event: ProviderEvent = {
      provider: 'flutterwave', eventId: 'sub_1', type: 'subscription.cancelled',
      createdAt: new Date(), data: { status: 'deactivated', plan: { id: 10944 } }, raw: {},
    }
    expect(interpretSubscriptionEvent(event)?.status).toBe('canceled')
  })
})
