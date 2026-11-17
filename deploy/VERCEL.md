# Deploy to Vercel

The simplest and best-tested target for Kobolar.

## Steps

1. Fork this repository and import it into Vercel.
2. Framework preset: **Next.js** (auto-detected). Node.js version: **24**.
3. Create a Postgres database (Neon, Supabase, Vercel Postgres, or any managed
   Postgres) and get its connection string.
4. Add environment variables in the Vercel project settings:
   - `DATABASE_URL` — use the **pooled** connection string
   - `NEXT_PUBLIC_APP_URL` — your final public origin (e.g. `https://kobolar.example.com`)
   - `BETTER_AUTH_URL` — same as above
   - `BETTER_AUTH_SECRET` — `openssl rand -base64 32`
   - `JOB_CRON_SECRET` — `openssl rand -base64 32`
   - `APP_ENCRYPTION_KEY` — `openssl rand -base64 32`
   - `EMAIL_PROVIDER` — `resend` or `sendbyte`
   - `EMAIL_API_KEY`, `EMAIL_FROM` — from your email provider
5. Apply migrations from your machine (or a one-off Vercel function):
   ```bash
   DATABASE_URL=… pnpm db:migrate
   ```
6. Deploy. The `vercel.json` in the repo registers a cron that calls
   `/api/cron/tick` every 5 minutes. Replace the placeholder secret in that
   file with a non-secret identifier, or better, keep the secret in the query
   string via an env-driven rewrite. The tick route validates `?secret=`
   against `JOB_CRON_SECRET`.

## Notes

- Use the pooled database connection to avoid exhausting connections from
  serverless functions.
- The admin, checkout, portal and webhook routes are dynamic and are never
  statically cached. `src/lib/security/headers.ts` sets no-store-friendly
  headers via `src/proxy.ts`.
- Provider webhook URLs are `/api/webhooks/{bachs,paystack,flutterwave}`.

## Cron secret handling

`vercel.json` cannot read environment variables. Two safe options:
1. Keep a random *non-secret* route token in `vercel.json` and compare it to a
   separate `CRON_ROUTE_TOKEN` env var (change the check in the tick route).
2. Use Vercel's Cron Secrets (recent feature) if available on your plan, which
   sends an `Authorization: Bearer` header that the tick route can verify.

Do not put a real secret in committed configuration.
