# Deploy to Cloudflare Workers (OpenNext)

Next.js 16 runs on Cloudflare Workers via the official `@opennextjs/cloudflare`
adapter. This is the most constrained target — read the caveats carefully.

## Steps

1. Fork this repository and clone your fork.
2. Create a Postgres database reachable from the Worker. Cloudflare's recommended
   path is **Hyperdrive** ( tunnels TCP Postgres through Cloudflare) or a
   serverless Postgres with an HTTP driver (Neon). The `postgres` driver and
   `drizzle-orm/postgres-js` used here work with Hyperdrive; with Neon HTTP you
   must swap the driver in `src/lib/db/index.ts`.
3. Install dependencies:
   ```bash
   pnpm add @opennextjs/cloudflare
   pnpm add -D wrangler
   ```
4. Set `NEXT_PUBLIC_APP_URL` in `wrangler.jsonc` to your final public origin.
5. Set secrets (never commit these):
   ```bash
   pnpm exec wrangler secret put DATABASE_URL
   pnpm exec wrangler secret put BETTER_AUTH_SECRET
   pnpm exec wrangler secret put JOB_CRON_SECRET
   pnpm exec wrangler secret put APP_ENCRYPTION_KEY
   pnpm exec wrangler secret put EMAIL_API_KEY   # if using Resend/Sendbyte
   ```
   Generate secrets with `openssl rand -base64 32`.
6. Apply migrations against your production database:
   ```bash
   DATABASE_URL=… pnpm db:migrate
   ```
7. Preview locally in the Workers runtime, then deploy:
   ```bash
   pnpm exec opennextjs-cloudflare build
   pnpm exec opennextjs-cloudflare preview
   pnpm exec opennextjs-cloudflare deploy
   ```

## Job processing / cron on Cloudflare

Add a Cron Trigger to `wrangler.jsonc`:

```jsonc
"crons": ["*/5 * * * *"]
```

Then add a `scheduled()` handler to a custom Worker entry (`worker.ts`) that
calls `https://<your-domain>/api/cron/tick?secret=<JOB_CRON_SECRET>`. The default
OpenNext worker does not forward scheduled events; see the OpenNext docs for
the `worker.ts` wrapper pattern. Until that is wired, invoke the tick endpoint
from an external scheduler (e.g. Cloudflare Workflows, a GitHub Action, or a
monitoring service).

## Caveats / verified constraints

- **Database connectivity** is the main risk. Workers cannot open arbitrary TCP
  connections; use Hyperdrive or an HTTP-based Postgres driver.
- **No filesystem writes.** Invoice PDFs are generated in memory and returned
  directly; to persist them you must add R2 object storage integration.
- **Bundle size** must stay under the Worker limit; check with
  `wrangler deploy --dry-run --outdir bundled/`.
- `nodejs_compat` is required and is already set in `wrangler.jsonc`.
- Email delivery via fetch (Resend/Sendbyte) works in Workers.

This target is supported but is the hardest to verify without a live Cloudflare
account and database — treat the first deployment as a verification exercise.
