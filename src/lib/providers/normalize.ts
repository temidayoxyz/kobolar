import type { ProviderEvent } from './types'

export type ExtractedPayment = {
  reference?: string
  providerSessionId?: string
  providerReference?: string
  status: 'pending' | 'succeeded' | 'failed'
  amount?: string
  currency?: string
}

export type InterpretedSubscription = {
  status?: string
  providerSubscriptionId?: string
  managementToken?: string
  periodStart?: Date
  periodEnd?: Date
  cancelAtPeriodEnd?: boolean
}

const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? undefined : String(v))

/**
 * Provider-specific payment event normalization. Pure function: no DB, no
 * network. Keeps provider knowledge out of the billing engine so it can be
 * unit-tested against captured webhook fixtures.
 */
export function extractPayment(event: ProviderEvent): ExtractedPayment {
  const data = event.data as Record<string, unknown>

  if (event.provider === 'bachs') {
    const succeeded = event.type === 'collection.succeeded' || event.type === 'checkout.completed'
    return {
      reference: str(data.reference),
      providerSessionId: str(data.checkout_id),
      providerReference: str(data.charge_id),
      status: succeeded ? 'succeeded' : event.type === 'collection.failed' ? 'failed' : 'pending',
      amount: str(data.amount),
      currency: str(data.currency),
    }
  }

  if (event.provider === 'paystack') {
    const status = str(data.status)
    return {
      reference: str(data.reference),
      providerReference: str(data.reference),
      status: event.type === 'charge.success' || status === 'success' ? 'succeeded' : status === 'failed' ? 'failed' : 'pending',
      amount: str(data.amount),
      currency: str(data.currency),
    }
  }

  if (event.provider === 'flutterwave') {
    const status = str(data.status)
    return {
      reference: str(data.tx_ref),
      providerReference: str(data.id),
      status: event.type === 'charge.completed' && status === 'successful' ? 'succeeded' : status === 'failed' ? 'failed' : 'pending',
      amount: str(data.amount),
      currency: str(data.currency),
    }
  }

  return { status: 'pending' }
}

/** Map a provider subscription event to a uniform subscription status. Pure. */
export function interpretSubscriptionEvent(event: ProviderEvent): InterpretedSubscription | null {
  const data = event.data as Record<string, unknown>

  if (event.provider === 'bachs') {
    if (!event.type.startsWith('customer.subscription.')) return null
    const deleted = event.type === 'customer.subscription.deleted'
    return {
      status: deleted ? 'canceled' : str(data.status),
      providerSubscriptionId: str(data.id),
      periodStart: data.current_period_start ? new Date(String(data.current_period_start)) : undefined,
      periodEnd: data.current_period_end ? new Date(String(data.current_period_end)) : undefined,
      cancelAtPeriodEnd: data.cancel_at_period_end === true,
    }
  }

  if (event.provider === 'paystack') {
    if (!event.type.startsWith('subscription.')) return null
    const nested = (data.subscription ?? data) as Record<string, unknown>
    return {
      status:
        event.type === 'subscription.disable' ? 'canceled'
          : event.type === 'subscription.not_renew' ? 'active'
            : 'active',
      providerSubscriptionId: str(nested.subscription_code) ?? str(nested.id),
      managementToken: str(nested.email_token),
      periodEnd: nested.next_payment_date ? new Date(String(nested.next_payment_date)) : undefined,
      cancelAtPeriodEnd: event.type === 'subscription.not_renew',
    }
  }

  if (event.provider === 'flutterwave') {
    if (event.type !== 'subscription.cancelled') return null
    return {
      status: 'canceled',
      providerSubscriptionId: str((data.plan as Record<string, unknown> | undefined)?.id),
    }
  }

  return null
}
