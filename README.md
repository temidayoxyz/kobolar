# Kobolar

Self-hostable billing and payment infrastructure for African creators and
developers. One business per installation. Serverless-first, Docker-optional.

> Kobolar is billing infrastructure. It does **not** make the installer a
> Merchant of Record and does not provide tax compliance or global payment
> acceptance. You remain responsible for your own legal, tax and payment
> provider obligations.

## Status

Phases 1–3 substantially implemented. Implemented:

- Next.js 16 + React 19 + TypeScript application shell
- Vendored Polar Orbit design system and UI packages (rebranded, OFL fonts only)
- Kobolar palette (charcoal / cream / stone / muted grey)
- Drizzle schema and migrations (business, catalog, customers, checkout, orders,
  payments, subscriptions, invoices, webhooks, jobs, audit)
- BetterAuth (email + password, verification, recovery, sessions)
- Database-backed job queue with a platform-agnostic cron tick
- Interchangeable email adapter (log / Resend / Sendbyte Africa)

Also implemented: provider adapters (Bachs, Paystack, Flutterwave) with
capability detection; hosted checkout; idempotent webhook intake →
server-verified order/payment/invoice/receipt; customer portal with signed
tokens and downloadable PDF invoices.

Next phases: subscription renewal processing and cancellation, admin dashboard
UI for products and customers, per-platform deployment verification, security
review, sandbox payment tests, and open-source release preparation.

**Important:** provider adapters were written against each provider's published
API contract. Bachs and Flutterwave were verified from their live docs in this
session; Paystack's docs block automated fetching, so its exact request/response
fields must be re-verified against the live API reference before production.
No adapter is certified for live money movement until sandbox tests pass.

## Local development

```bash
cp .env.example .env.local   # fill in the values
pnpm install
pnpm db:generate             # generate migrations after schema changes
pnpm db:migrate              # apply migrations
pnpm dev
```

## Deployment

See [`deploy/COMPATIBILITY.md`](./deploy/COMPATIBILITY.md). Supported targets:
Cloudflare (OpenNext), Vercel, Netlify, and traditional self-hosting. Docker
Compose is optional.

## Architecture

See `ATTRIBUTION.md` for provenance and licensing of adapted components.
The implementation plan and Polar research reports live outside this repository
in `D:\temp\opencode\polar-research\`.
