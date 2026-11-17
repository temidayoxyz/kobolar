# Provider verification

Before enabling a payment provider for real money, verify the adapter against
that provider's sandbox/test environment. Kobolar ships two layers of checks.

## 1. Offline checks (no credentials, no network)

Fixture-based tests verify webhook signature verification and event
normalization against payload shapes taken from each provider's official docs:

```bash
pnpm verify:providers
```

This runs:
- Bachs: HMAC-SHA256 V2 signature accepted, tampered body rejected
- Paystack: HMAC-SHA512 signature accepted, tampered body rejected
- Flutterwave: `verif-hash` shared secret accepted, wrong secret rejected
- Subscription event normalization for all three providers

These tests prove the *code* is correct against *documented* payloads. They
cannot prove the provider actually sends those payloads or that the API
endpoints match — that is what the live checks are for.

## 2. Live sandbox checks (requires test credentials)

```bash
BACHS_SANDBOX_API_KEY=sk_sandbox_xxx \
PAYSTACK_TEST_SECRET_KEY=sk_test_xxx \
FLW_TEST_SECRET_KEY=FLWSECK_TEST-xxx \
pnpm verify:providers -- --live
```

The script:

- **Refuses non-sandbox keys** (checks key prefixes) so live money cannot be touched.
- Creates a **test checkout session** at each provider using its published
  endpoint and the exact request shape Kobolar's adapter uses.
- Confirms the response contains the field the adapter reads (`checkout_url`,
  `authorization_url`, `data.link`).
- Prints masks of the keys, never their values.

Only checkout sessions are created — no payment is captured. Any mismatch
between the adapter's assumptions and the provider's real response appears as
a FAIL with the response body (truncated).

## What the live checks do NOT cover

- Webhook delivery and signature verification with a real provider event. To
  verify that, configure the provider's webhook URL to
  `/api/webhooks/{provider}`, trigger a test event, and confirm a
  `provider_event` row is created with status `processed`.
- Subscription lifecycle events end to end. Use a sandbox recurring checkout
  and observe `customer.subscription.*` / `subscription.*` webhooks.
- Payouts, refunds and disputes. Verify these manually in the provider sandbox.

## Enabling a provider

Only after both layers pass:

1. Set credentials in Settings (encrypted with `APP_ENCRYPTION_KEY`).
2. Register the webhook URL in the provider dashboard with the same webhook
   secret you configured in Kobolar.
3. Do one small real transaction and confirm:
   - checkout redirect works
   - payment is verified server-side
   - an order, payment and invoice are created
   - the receipt email is delivered

Record the results in your operations log.
