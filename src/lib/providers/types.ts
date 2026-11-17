/**
 * Provider abstraction. The billing engine depends only on this interface,
 * never on a provider's SDK or REST shape directly.
 *
 * Capabilities are explicit: a provider that cannot do something must not
 * advertise it, and the UI must gate actions using this object.
 */

export type ProviderId = 'bachs' | 'paystack' | 'flutterwave'

export type RecurringMode = 'native' | 'tokenized' | 'none'

export interface ProviderCapabilities {
  hostedCheckout: boolean
  serverSideVerification: boolean
  signedWebhooks: boolean
  refunds: boolean
  disputes: boolean
  /** native = provider owns the billing cycle; tokenized = Kobolar schedules charges. */
  recurring: RecurringMode[]
  currencies: string[]
  webhookEvents: string[]
}

export interface CreateCheckoutInput {
  reference: string
  amount: string
  currency: string
  description: string
  customerEmail?: string
  customerName?: string
  successUrl: string
  cancelUrl: string
  metadata?: Record<string, string>
  recurring?: { interval: 'month' | 'year'; planId?: string }
}

export interface CheckoutSession {
  providerSessionId: string
  checkoutUrl: string
  expiresAt?: Date
}

export interface ProviderPayment {
  providerReference: string
  status: 'pending' | 'succeeded' | 'failed'
  amount: string
  currency: string
  paidAt?: Date
  raw: Record<string, unknown>
}

export interface ProviderEvent {
  provider: ProviderId
  eventId: string
  type: string
  createdAt: Date
  data: Record<string, unknown>
  raw: Record<string, unknown>
}

export interface RefundInput {
  providerReference: string
  amount: string
  currency: string
  reason?: string
}

export interface RefundResult {
  providerReference: string
  status: 'pending' | 'succeeded' | 'failed'
}

export interface PaymentProvider {
  readonly id: ProviderId
  readonly capabilities: ProviderCapabilities

  createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession>
  verifyWebhook(rawBody: string, headers: Headers): Promise<ProviderEvent>
  getPayment(providerReference: string): Promise<ProviderPayment>

  refund?(input: RefundInput): Promise<RefundResult>

  /** Native recurring providers only. */
  cancelSubscription?(providerSubscriptionId: string): Promise<void>
  getSubscription?(providerSubscriptionId: string): Promise<{
    status: string
    currentPeriodEnd?: Date
  }>

  /** Tokenized recurring providers only. */
  createCharge?(token: string, amount: string, currency: string, reference: string): Promise<ProviderPayment>
}

export class UnsupportedCapabilityError extends Error {
  constructor(provider: ProviderId, capability: keyof ProviderCapabilities) {
    super(`Provider "${provider}" does not support "${String(capability)}"`)
    this.name = 'UnsupportedCapabilityError'
  }
}
