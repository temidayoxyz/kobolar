import type {
  CheckoutSession,
  CreateCheckoutInput,
  PaymentProvider,
  ProviderCapabilities,
  ProviderEvent,
  ProviderPayment,
  RefundInput,
  RefundResult,
} from './types'
import { hmacHex, providerFetch, timingSafeEqual } from './shared'

const BASE_URL = process.env.BACHS_BASE_URL ?? 'https://api.bachs.io'
const WEBHOOK_TOLERANCE_SECONDS = 300

export function bachsProvider(credentials: { apiKey: string; webhookSecret: string }): PaymentProvider {
  const auth = { Authorization: `Bearer ${credentials.apiKey}` }

  async function verifyWebhook(rawBody: string, headers: Headers): Promise<ProviderEvent> {
    const header = headers.get('X-Bachs-Signature-V2') ?? headers.get('X-Bachs-Signature')
    if (!header) throw new Error('Missing Bachs signature header')

    let timestamp: string
    let signatures: string[]
    if (header.includes('v1=')) {
      const parts = header.split(',')
      timestamp = parts.find((p) => p.startsWith('t='))?.slice(2) ?? ''
      signatures = parts.filter((p) => p.startsWith('v1=')).map((p) => p.slice(3))
    } else {
      timestamp = headers.get('X-Bachs-Timestamp') ?? ''
      signatures = [header]
    }
    if (!timestamp || !/^\d+$/.test(timestamp)) throw new Error('Invalid Bachs timestamp')
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > WEBHOOK_TOLERANCE_SECONDS) {
      throw new Error('Bachs webhook timestamp outside tolerance')
    }

    const expected = await hmacHex(credentials.webhookSecret, `${timestamp}.${rawBody}`)
    if (!signatures.some((signature) => timingSafeEqual(signature, expected))) {
      throw new Error('Invalid Bachs webhook signature')
    }

    const payload = JSON.parse(rawBody) as {
      id: string
      type: string
      created_at: string
      data: Record<string, unknown>
    }
    return {
      provider: 'bachs',
      eventId: payload.id,
      type: payload.type,
      createdAt: new Date(payload.created_at),
      data: payload.data ?? {},
      raw: payload as unknown as Record<string, unknown>,
    }
  }

  return {
    id: 'bachs',
    capabilities: {
      hostedCheckout: true,
      serverSideVerification: true,
      signedWebhooks: true,
      refunds: true,
      disputes: true,
      recurring: ['native'],
      currencies: ['NGN', 'USD', 'GHS', 'KES', 'TZS', 'UGX', 'XAF', 'XOF', 'RWF', 'MWK', 'ZMW'],
      webhookEvents: [
        'checkout.completed', 'checkout.expired', 'collection.succeeded', 'collection.failed',
        'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted',
        'invoice.created', 'invoice.paid', 'invoice.payment_failed', 'refund.paid', 'dispute.created',
      ],
    },

    async createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession> {
      const payload: Record<string, unknown> = {
        reference: input.reference,
        customer: { email: input.customerEmail, name: input.customerName },
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        metadata: input.metadata ?? {},
      }
      if (input.recurring) {
        payload.product_cart = input.recurring.planId
          ? [{ product_id: input.recurring.planId }]
          : []
      } else {
        payload.pricing = { currency: input.currency, amount: input.amount }
      }

      const result = (await providerFetch(`${BASE_URL}/v1/checkout-sessions`, {
        method: 'POST',
        headers: auth,
        body: payload,
        idempotencyKey: `checkout-${input.reference}`,
      })) as { checkout_id: string; checkout_url: string; expires_at?: string }

      return {
        providerSessionId: result.checkout_id,
        checkoutUrl: result.checkout_url,
        expiresAt: result.expires_at ? new Date(result.expires_at) : undefined,
      }
    },

    verifyWebhook,

    async getPayment(providerReference: string): Promise<ProviderPayment> {
      const result = (await providerFetch(`${BASE_URL}/v1/payments/${encodeURIComponent(providerReference)}`, {
        headers: auth,
      })) as {
        id: string
        status: string
        amount: string
        currency: string
        created_at?: string
      }
      return {
        providerReference: result.id,
        status: result.status === 'SUCCEEDED' ? 'succeeded' : result.status === 'FAILED' ? 'failed' : 'pending',
        amount: result.amount,
        currency: result.currency,
        paidAt: result.created_at ? new Date(result.created_at) : undefined,
        raw: result as unknown as Record<string, unknown>,
      }
    },

    async refund(input: RefundInput): Promise<RefundResult> {
      const result = (await providerFetch(`${BASE_URL}/v1/refunds`, {
        method: 'POST',
        headers: auth,
        body: { charge_id: input.providerReference, amount: input.amount, reason: input.reason },
        idempotencyKey: `refund-${input.providerReference}-${input.amount}`,
      })) as { id: string; status: string }
      return {
        providerReference: result.id,
        status: result.status === 'succeeded' ? 'succeeded' : result.status === 'failed' ? 'failed' : 'pending',
      }
    },

    async cancelSubscription(providerSubscriptionId: string) {
      await providerFetch(`${BASE_URL}/v1/subscriptions/${encodeURIComponent(providerSubscriptionId)}/cancel`, {
        method: 'POST',
        headers: auth,
      })
    },
  }
}

export const bachsCapabilities: ProviderCapabilities = {
  hostedCheckout: true,
  serverSideVerification: true,
  signedWebhooks: true,
  refunds: true,
  disputes: true,
  recurring: ['native'],
  currencies: ['NGN', 'USD'],
  webhookEvents: [],
}
