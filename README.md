# Kobolar

Self-hostable billing and payment infrastructure for African creators and
developers. One business per installation. Serverless-first, Docker-optional.

> Kobolar is billing infrastructure. It does **not** make the installer a
> Merchant of Record and does not provide tax compliance or global payment
> acceptance. You remain responsible for your own legal, tax and payment
> provider obligations.

## Status

Phase 1 foundation. Implemented:

- Next.js 16 + React 19 + TypeScript application shell
- Vendored Polar Orbit design system and UI packages (rebranded, OFL fonts only)
- Kobolar palette (charcoal / cream / stone / muted grey)
- Drizzle schema and migrations (business, catalog, customers, checkout, orders,
  payments, subscriptions, invoices, webhooks, jobs, audit)
- BetterAuth (email + password, verification, recovery, sessions)
- Database-backed job queue with a platform-agnostic cron tick
- Interchangeable email adapter (log / Resend / Sendbyte Africa)

Next phases: payment provider adapters (Bachs first, then Paystack and
Flutterwave), core billing, subscriptions, customer portal, reliability.

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
