# Kobolar

Self-hostable billing and payment infrastructure for African creators and
developers. One business per installation. Serverless-first, Docker-optional.

> Kobolar is billing infrastructure. It does **not** make the installer a
> Merchant of Record and does not provide tax compliance or global payment
> acceptance. You remain responsible for your own legal, tax and payment
> provider obligations.

## Status

The core product is implemented end to end:

- Next.js 16 + React 19 + TypeScript application with security headers
- Vendored Polar Orbit design system and UI packages (rebranded, OFL fonts only)
- Kobolar palette (charcoal / cream / stone / muted grey)
- Drizzle schema and migrations (21 tables) for the full billing domain
- BetterAuth (email + password, verification, recovery, secure sessions)
- AES-GCM encryption for provider credentials
- Three provider adapters (Bachs, Paystack, Flutterwave) with explicit capability detection
- Hosted checkout and idempotent webhook intake → server-verified order/payment/invoice/receipt
- Subscription lifecycle from signed provider webhooks plus admin/self-service cancellation
- Customer portal with signed, expiring tokens (no customer accounts) and PDF invoices
- Full admin dashboard (overview, products, customers, orders, subscriptions, settings)
- Database-backed job queue with a platform-agnostic cron tick
- Deploy configs and docs for Cloudflare, Vercel, Netlify and self-hosting

Done: security review, dependency audit (high-severity Drizzle advisory fixed),
backup/restore documentation, CI workflow.

**Before real money moves:** verify each provider adapter against sandbox
credentials (the API contracts come from published docs, not live keys). See
`docs/SECURITY-REVIEW.md` for the residual risks and the pre-production checklist.

## Local development

```bash
cp .env.example .env.local   # fill in the values
pnpm install
pnpm db:generate             # generate migrations after schema changes
pnpm db:migrate              # apply migrations
pnpm dev
```

Run checks: `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Deployment

Pick a target:

- [`deploy/VERCEL.md`](./deploy/VERCEL.md) — easiest, best tested
- [`deploy/CLOUDFLARE.md`](./deploy/CLOUDFLARE.md) — Workers via OpenNext (most constrained)
- [`deploy/NETLIFY.md`](./deploy/NETLIFY.md) — Netlify + scheduled functions
- [`deploy/SELF-HOST.md`](./deploy/SELF-HOST.md) — traditional server (Docker optional)
- [`deploy/COMPATIBILITY.md`](./deploy/COMPATIBILITY.md) — feature matrix
- [`docs/BACKUP-RESTORE.md`](./docs/BACKUP-RESTORE.md) — backup and recovery

## Documentation

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — accepted architecture decisions
- [`docs/SECURITY-REVIEW.md`](./docs/SECURITY-REVIEW.md) — security design and checklist
- [`ATTRIBUTION.md`](./ATTRIBUTION.md) — provenance and licensing of adapted components

The Polar research reports and implementation plan live outside this repository
in `D:\temp\opencode\polar-research\`.
