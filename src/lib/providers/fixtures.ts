/**
 * Curated webhook payloads from each provider's official documentation.
 * Used by the verification harness to test signature verification and event
 * normalization without touching live money.
 */
export type Fixture = {
  provider: 'bachs' | 'paystack' | 'flutterwave'
  name: string
  rawBody: string
  headers: Record<string, string>
  secret: string
  expectedType: string
}

export const WEBHOOK_SECRET = 'whsec_test_verification_secret_1234567890'
export const FIXED_TIMESTAMP = String(Math.floor(Date.now() / 1000))

const bachsBody = JSON.stringify({
  id: 'evt_verify_001',
  type: 'collection.succeeded',
  created_at: '2026-11-17T12:00:00Z',
  organization_id: 'acct_test',
  data: {
    charge_id: 'ch_verify_001',
    checkout_id: 'chk_verify_001',
    status: 'SUCCEEDED',
    amount: '29.00',
    currency: 'USD',
  },
})

const paystackBody = JSON.stringify({
  event: 'charge.success',
  data: {
    id: 1234567,
    reference: 'kbo_verify_001',
    status: 'success',
    amount: 290000,
    currency: 'NGN',
    paid_at: '2026-11-17T12:00:00.000Z',
  },
})

const flutterwaveBody = JSON.stringify({
  event: 'charge.completed',
  'event.type': 'CARD_TRANSACTION',
  data: {
    id: 285959875,
    tx_ref: 'kbo_verify_001',
    flw_ref: 'FLW-VERIFY-001',
    amount: 2900,
    currency: 'NGN',
    status: 'successful',
    created_at: '2026-11-17T12:00:00.000Z',
  },
})

export const fixtures: Fixture[] = [
  {
    provider: 'bachs',
    name: 'collection.succeeded',
    rawBody: bachsBody,
    headers: {
      'X-Bachs-Signature-V2': `t=${FIXED_TIMESTAMP},v1=SIGNATURE_PLACEHOLDER`,
    },
    secret: WEBHOOK_SECRET,
    expectedType: 'collection.succeeded',
  },
  {
    provider: 'paystack',
    name: 'charge.success',
    rawBody: paystackBody,
    headers: { 'x-paystack-signature': 'SIGNATURE_PLACEHOLDER' },
    secret: WEBHOOK_SECRET,
    expectedType: 'charge.success',
  },
  {
    provider: 'flutterwave',
    name: 'charge.completed',
    rawBody: flutterwaveBody,
    headers: { 'verif-hash': WEBHOOK_SECRET },
    secret: WEBHOOK_SECRET,
    expectedType: 'charge.completed',
  },
]
