# Security review (Phase 6)

This document records the security design and the checks performed. It is a
starting point, not a certification.

## Controls implemented

| Area | Control | Evidence |
|---|---|---|
| Secrets | No secrets in source; `.env.example` only; production env validation fails fast on weak/missing secrets | `src/lib/env.ts` |
| Credentials | Provider keys encrypted with AES-GCM before DB storage | `src/lib/crypto.ts`, `api/admin/business` |
| Frontend secrets | No secret keys exposed; only `NEXT_PUBLIC_APP_URL` is public | grep for `NEXT_PUBLIC_` |
| Webhooks | Raw-body signature verification with timing-safe comparison; dedup by unique event id; 2xx returned before processing | `src/lib/webhooks/intake.ts`, provider adapters |
| Payment integrity | All payments re-verified server-side via provider API before fulfilment; redirects never trusted | `src/lib/billing/fulfillment.ts` |
| Idempotency | Unique payment reference and checkout status guard prevent double-fulfilment | schema + fulfillment |
| Customer portal | HMAC-signed expiring tokens scoped to one customer; no customer accounts/passwords | `src/lib/portal/token.ts` |
| Admin | All `/api/admin/*` routes call `auth.api.getSession`; dashboard layout redirects unauthenticated users | admin routes, dashboard layout |
| Auth | BetterAuth email/password with verification, recovery, secure cookie sessions | `src/lib/auth/index.ts` |
| Headers | CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy on all responses | `src/lib/security/headers.ts`, `src/proxy.ts` |
| Rate limiting | DB-backed fixed-window limiter on auth/checkout/portal routes plus BetterAuth per-route rules | `src/lib/security/rate-limit.ts`, `src/lib/auth/index.ts` |
| SQL injection | All queries via Drizzle parameterized queries; no string concatenation of user input | `src/lib/db/*` |
| Money | Decimal arithmetic via big.js; integer/decimal conversions isolated in providers | `src/lib/money`, providers |
| Audit | Provider events and audit_log table record significant actions | schema, intake |

## Threat notes / residual risks

- **Rate limiting is implemented** via `src/lib/security/rate-limit.ts`, a
  DB-backed fixed-window limiter that works on every deployment target. Applied
  to auth (30/min per IP), checkout (10/min), and portal link creation (20/min).
  BetterAuth additionally applies per-route rules (e.g. sign-in 10/min).
  For high-volume abuse, add platform WAF rules on top (Cloudflare Rate
  Limiting, Vercel WAF); the DB limiter is designed for baseline protection.
- **CSRF:** BetterAuth cookies are SameSite=Lax by default; state-changing
  Route Handlers rely on this plus JSON content type. Consider explicit CSRF
  tokens if embedding in third-party contexts (not supported by design).
- **Admin authorization is coarse:** any authenticated BetterAuth user is an
  admin. This matches the single-business model; do not grant accounts to
  untrusted people.
- **Payment provider API contracts** were verified from published docs, not
  certified against live keys. Sandbox tests are required before real money.
- **Invoice PDFs** are generated in memory. No malware/file upload surface
  exists in the MVP, reducing risk.
- **Email deliverability** (SPF/DKIM/DMARC) is the operator's responsibility.

## Dependency audit (2026-11-17)

`pnpm audit --audit-level=moderate` was run. Findings:
- **Fixed:** `drizzle-orm` < 0.45.4 had a high-severity SQL identifier injection
  advisory (GHSA-gpj5-g38j-94v9). Upgraded to 0.45.4.
- **Remaining (accepted):** a moderate advisory in `esbuild` <= 0.24.2
  (GHSA-67mh-4wv8-2f99, dev-server request leakage) reachable only through
  `drizzle-kit`'s dev-only transitive dependencies. It does not ship in the
  production runtime. Re-check when drizzle-kit updates its dependency tree.

## Recommendations before production

1. Verify each provider against its sandbox (`docs/PROVIDER-VERIFICATION.md`).
2. Run `pnpm audit` and update any vulnerable dependencies.
3. Rotate all dev default secrets; verify production env validation throws when
   they are missing.
4. Perform a live sandbox transaction end-to-end for each enabled provider,
   including a webhook replay (duplicate event) to confirm idempotency.
5. Confirm webhook signature verification against a real provider test event.
6. Enable backups and test a restore (see `docs/BACKUP-RESTORE.md`).
