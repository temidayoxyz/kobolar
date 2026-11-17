import type {
  CheckoutSession,
  CreateCheckoutInput,
  PaymentProvider,
  ProviderEvent,
  ProviderPayment,
  RefundInput,
  RefundResult,
} from './types'
import { providerFetch, timingSafeEqual } from './shared'

const BASE_URL = 'https://api.flutterwave.com/v3'

/**
 * Flutterwave adapter. Verified against official docs:
 * - Hosted checkout: POST /v3/payments → data.link
 * - Verify: GET /v3/transactions/{id}/verify (check status, tx_ref, currency, amount)
 * - Webhook: `verif-hash` secret header, respond 200 fast, 60s timeout,
 *   3 retries at 30-min intervals, dedup by event key.
 * - Recurring: Payment Plans API exists (POST /v3/payment-plans,
 *   PUT /v3/payment-plans/{id}/cancel), so native is supported.
 */
export function flutterwaveProvider(credentials: {
  secretKey: string
  webhookSecret: string
  encryptionKey?: string
}): PaymentProvider {
  const auth = { Authorization: `Bearer ${credentials.secretKey}` }

  async function verifyWebhook(rawBody: string, headers: Headers): Promise<ProviderEvent> {
    const signature = headers.get('verif-hash')
    if (!signature || !timingSafeEqual(signature, credentials.webhookSecret)) {
      throw new Error('Invalid Flutterwave webhook secret')
    }
    const payload = JSON.parse(rawBody) as {
      event: string
      'event.type'?: string
      data?: Record<string, unknown> & { id?: number | string }
      [key: string]: unknown
    }
    const id = payload.data?.id
    return {
      provider: 'flutterwave',
      eventId: `${payload.event}:${id ?? JSON.stringify(payload).length}`,
      type: payload.event,
      createdAt: new Date(),
      data: payload.data ?? {},
      raw: payload as unknown as Record<string, unknown>,
    }
  }

  return {
    id: 'flutterwave',
    capabilities: {
      hostedCheckout: true,
      serverSideVerification: true,
      signedWebhooks: true,
      refunds: true,
      disputes: true,
      recurring: ['native', 'tokenized'],
      currencies: ['NGN', 'USD', 'GHS', 'KES', 'TZS', 'UGX', 'ZAR', 'EGP'],
      webhookEvents: ['charge.completed', 'subscription.cancelled', 'transfer.completed', 'refund.completed'],
    },

    async createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession> {
      const body: Record<string, unknown> = {
        amount: Number(input.amount),
        tx_ref: input.reference,
        currency: input.currency,
        redirect_url: input.successUrl,
        customer: {
          email: input.customerEmail,
          name: input.customerName,
        },
        customizations: { title: input.description },
        meta: { ...input.metadata, cancel_url: input.cancelUrl },
      }
      if (input.recurring?.planId) body.payment_plan = Number(input.recurring.planId)

      const result = (await providerFetch(`${BASE_URL}/payments`, {
        method: 'POST',
        headers: auth,
        body,
        idempotencyKey: `checkout-${input.reference}`,
      })) as { status: string; data: { link: string } }

      return {
        providerSessionId: input.reference,
        checkoutUrl: result.data.link,
      }
    },

    verifyWebhook,

    async getPayment(providerReference: string): Promise<ProviderPayment> {
      const result = (await providerFetch(
        `${BASE_URL}/transactions/${encodeURIComponent(providerReference)}/verify`,
        { headers: auth },
      )) as {
        status: string
        data: { id: number; tx_ref: string; status: string; amount: number; currency: string; created_at?: string }
      }
      return {
        providerReference: String(result.data.id),
        status: result.data.status === 'successful' ? 'succeeded' : result.data.status === 'failed' ? 'failed' : 'pending',
        amount: String(result.data.amount),
        currency: result.data.currency,
        paidAt: result.data.created_at ? new Date(result.data.created_at) : undefined,
        raw: result as unknown as Record<string, unknown>,
      }
    },

    async refund(input: RefundInput): Promise<RefundResult> {
      const result = (await providerFetch(`${BASE_URL}/refunds`, {
        method: 'POST',
        headers: auth,
        body: {
          id: Number(input.providerReference),
          amount: Number(input.amount),
          reason: input.reason,
        },
        idempotencyKey: `refund-${input.providerReference}-${input.amount}`,
      })) as { status: string; data: { id: number; status: string } }
      return {
        providerReference: String(result.data.id),
        status: result.data.status === 'completed' ? 'succeeded' : 'pending',
      }
    },

    // Verified: POST /v3/payment-plans creates a plan; POST /v3/payments with
    // payment_plan subscribes the customer. Cancellation is via the payment
    // plan id (PUT /v3/payment-plans/{id}/cancel) — verified from the docs index.
    async createPlan(input: { name: string; amount: string; currency: string; interval: 'month' | 'year' }) {
      const result = (await providerFetch(`${BASE_URL}/payment-plans`, {
        method: 'POST',
        headers: auth,
        body: {
          name: input.name,
          amount: Number(input.amount),
          currency: input.currency,
          interval: input.interval === 'year' ? 'yearly' : 'monthly',
        },
      })) as { status: string; data: { id: number } }
      return { planId: String(result.data.id) }
    },

    async cancelSubscription(providerSubscriptionId: string) {
      await providerFetch(`${BASE_URL}/payment-plans/${encodeURIComponent(providerSubscriptionId)}/cancel`, {
        method: 'PUT',
        headers: auth,
      })
    },

    async createCharge(token: string, amount: string, currency: string, reference: string) {
      const result = (await providerFetch(`${BASE_URL}/charges?type=card`, {
        method: 'POST',
        headers: auth,
        body: {
          amount: Number(amount),
          currency,
          tx_ref: reference,
          token,
          email: '',
        },
        idempotencyKey: `charge-${reference}`,
      })) as { status: string; data: { id: number; status: string; amount: number; currency: string } }
      return {
        providerReference: String(result.data.id),
        status: result.data.status === 'successful' ? 'succeeded' : result.data.status === 'failed' ? 'failed' : 'pending',
        amount: String(result.data.amount),
        currency: result.data.currency,
        raw: result as unknown as Record<string, unknown>,
      }
    },
  }
}
