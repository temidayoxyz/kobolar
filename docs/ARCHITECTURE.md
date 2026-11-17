# Architecture decisions (Kobolar)

Accepted decisions made during Phase 0. These are binding unless superseded.

## ADR-K01 — Single business per installation
One Kobolar deployment serves one business. No organizations, public merchant
registration, memberships or per-tenant rows. This removes Polar's entire
multi-tenant authorization surface. Future expansion would require a new ADR.

## ADR-K02 — Next.js full-stack, one codebase
Next.js App Router handles UI, SSR and all API endpoints (Route Handlers).
Server Actions are used only where request-scoped mutation is appropriate.
No separate backend service in the MVP.

## ADR-K03 — Platform-agnostic background work
A `job_queue` Postgres table plus a `/api/cron/tick` endpoint is the baseline.
Each platform's scheduler calls that endpoint. Platform-native queues may be
added behind the same `enqueue`/`processJobs` interface. No always-on worker.
Jobs are claimed with `FOR UPDATE SKIP LOCKED` and retried with backoff.

## ADR-K04 — Provider abstraction with explicit capabilities
The billing engine depends on `PaymentProvider` (see
`src/lib/providers/types.ts`), never on a provider SDK. Capabilities are
declared per provider and used to gate UI and domain actions. Recurring billing
is `native` for all three providers (Bachs recurring products, Paystack Plans,
Flutterwave Payment Plans); Flutterwave additionally supports `tokenized`
card-on-file charges. Capabilities are verified from official provider docs.

## ADR-K05 — Decimal money
Amounts are stored as `numeric(19,4)` with an explicit currency. No binary
floating point for money. Provider conversions happen at the adapter boundary:
Bachs uses decimal strings, Paystack minor units, Flutterwave decimals.

## ADR-K06 — Webhook intake is idempotent and fast
Provider webhook routes verify the signature against the **raw body**, persist
a `provider_event` row with a unique `(provider, event_id)` key, return 2xx
immediately, and enqueue processing. Redirects are never proof of payment.

## ADR-K07 — No Merchant of Record claims
Kobolar provides infrastructure only. The operator is responsible for legal,
tax and payment-provider obligations. This is stated in the README, UI and
docs. No tax engine or MoR status is implemented.

## ADR-K09 — Subscription lifecycle follows provider capabilities
All three providers own their recurring billing cycles natively (Bachs
recurring products, Paystack Plans, Flutterwave Payment Plans). Kobolar mirrors
state from signed webhooks (`customer.subscription.*`, `subscription.*`,
`invoice.*`, `charge.completed`, `subscription.cancelled`) rather than scheduling
charges. Paystack cancellation requires the `email_token` from
`subscription.create`, which is stored encrypted-adjacent metadata in the
subscription row. Failed-payment and cancellation notifications are queued jobs.
No card-on-file charging is scheduled by default; the `tokenized` capability is
declared but only used when explicitly enabled per subscription.

## ADR-K08 — Frontend provenance and rebranding
Orbit/UI/currency/i18n are adapted from Polar under Apache 2.0 with attribution
in `ATTRIBUTION.md`. Commercial fonts and all Polar trademarks are removed.
Functional colors are defined independently from the Kobolar brand palette.
