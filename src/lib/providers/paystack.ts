import type {
  CheckoutSession,
  CreateCheckoutInput,
  PaymentProvider,
  ProviderEvent,
  ProviderPayment,
  RefundInput,
  RefundResult,
} from './types'
import { decimalToMinor, hmacHex, minorToDecimal, providerFetch, timingSafeEqual } from './shared'

const BASE_URL = 'https://api.paystack.co'

/**
 * Paystack adapter.
 *
 * NOTE: endpoints and the x-paystack-signature (HMAC-SHA512 of the raw body)
 * follow Paystack's documented contract. Paystack's docs block automated
 * fetching, so verify exact request/response fields against the live API
 * reference before production use. No capability is assumed beyond Plans,
 * Subscriptions, verification, refunds and webhooks.
 */
export function paystackProvider(credentials: { secretKey: string; webhookSecret: string }): PaymentProvider {
  const auth = { Authorization: `Bearer ${credentials.secretKey}` }

  async function verifyWebhook(rawBody: string, headers: Headers): Promise<ProviderEvent> {
    const signature = headers.get('x-paystack-signature')
    if (!signature) throw new Error('Missing Paystack signature header')
    const expected = await hmacHex(credentials.webhookSecret, rawBody, 'SHA-512')
    if (!timingSafeEqual(signature, expected)) throw new Error('Invalid Paystack webhook signature')

    const payload = JSON.parse(rawBody) as {
      event: string
      data: Record<string, unknown> & { id?: number | string }
    }
    const dataId = payload.data?.id
    return {
      provider: 'paystack',
      eventId: dataId !== undefined ? `${payload.event}:${dataId}` : `${payload.event}:${rawBody.length}`,
      type: payload.event,
      createdAt: new Date(),
      data: payload.data ?? {},
      raw: payload as unknown as Record<string, unknown>,
    }
  }

  return {
    id: 'paystack',
    capabilities: {
      hostedCheckout: true,
      serverSideVerification: true,
      signedWebhooks: true,
      refunds: true,
      disputes: true,
      recurring: ['native'],
      currencies: ['NGN', 'USD', 'GHS', 'ZAR', 'KES'],
      webhookEvents: [
        'charge.success', 'charge.failed', 'subscription.create', 'subscription.disable',
        'invoice.create', 'invoice.update', 'invoice.payment_failed', 'refund.success',
      ],
    },

    async createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession> {
      const body: Record<string, unknown> = {
        email: input.customerEmail,
        amount: decimalToMinor(input.amount),
        currency: input.currency,
        reference: input.reference,
        callback_url: input.successUrl,
        metadata: { ...input.metadata, cancel_url: input.cancelUrl, custom_fields: input.customerName ? [{ display_name: 'Name', variable_name: 'customer_name', value: input.customerName }] : [] },
      }
      if (input.recurring?.planId) body.plan = input.recurring.planId

      const result = (await providerFetch(`${BASE_URL}/transaction/initialize`, {
        method: 'POST',
        headers: auth,
        body,
        idempotencyKey: `checkout-${input.reference}`,
      })) as { status: boolean; data: { authorization_url: string; access_code: string; reference: string } }

      return {
        providerSessionId: result.data.reference,
        checkoutUrl: result.data.authorization_url,
      }
    },

    verifyWebhook,

    async getPayment(providerReference: string): Promise<ProviderPayment> {
      const result = (await providerFetch(
        `${BASE_URL}/transaction/verify/${encodeURIComponent(providerReference)}`,
        { headers: auth },
      )) as {
        status: boolean
        data: {
          reference: string
          status: string
          amount: number
          currency: string
          paid_at?: string
        }
      }
      return {
        providerReference: result.data.reference,
        status: result.data.status === 'success' ? 'succeeded' : result.data.status === 'failed' ? 'failed' : 'pending',
        amount: minorToDecimal(result.data.amount),
        currency: result.data.currency,
        paidAt: result.data.paid_at ? new Date(result.data.paid_at) : undefined,
        raw: result as unknown as Record<string, unknown>,
      }
    },

    async refund(input: RefundInput): Promise<RefundResult> {
      const result = (await providerFetch(`${BASE_URL}/refund`, {
        method: 'POST',
        headers: auth,
        body: {
          transaction: input.providerReference,
          amount: decimalToMinor(input.amount),
          currency: input.currency,
          reason: input.reason,
        },
        idempotencyKey: `refund-${input.providerReference}-${input.amount}`,
      })) as { status: boolean; data: { id: number; status: string } }
      return {
        providerReference: String(result.data.id),
        status: result.data.status === 'refunded' ? 'succeeded' : 'pending',
      }
    },

    // Paystack docs were not machine-readable in this session; the exact
    // disable-subscription contract must be verified before use.
    async cancelSubscription() {
      throw new Error('Paystack cancelSubscription: endpoint not yet verified against provider docs')
    },
  }
}
