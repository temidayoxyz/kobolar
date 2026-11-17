# Self-host (traditional server)

Docker is **optional**. Kobolar is a standard Next.js app and runs anywhere Node.js 24 runs.

## Without Docker (recommended for a small VPS)

1. Install Node.js 24 and pnpm 10.
2. Clone the repo, `pnpm install --frozen-lockfile`.
3. Set up PostgreSQL (any version 14+) and create a database.
4. Create a `.env.local` from `.env.example` with strong secrets
   (`openssl rand -base64 32` for each secret field).
5. Apply migrations: `pnpm db:migrate`.
6. Build and start: `pnpm build && pnpm start` (put a reverse proxy with TLS
   in front, e.g. Caddy or nginx).
7. Schedule the job processor with cron:
   ```cron
   */5 * * * * curl -sf "https://your-domain/api/cron/tick?secret=YOUR_JOB_CRON_SECRET" >/dev/null
   ```
8. Point provider webhooks at `/api/webhooks/{bachs,paystack,flutterwave}`.

## With Docker (optional convenience)

The included `docker-compose.yml` starts Postgres and the app. Copy
`.env.example` to `.env`, fill in the secrets, then:

```bash
docker compose up -d
docker compose exec app pnpm db:migrate   # first run only
```

The app container runs migrations automatically before `pnpm start`.

## Reverse proxy / TLS

Terminate TLS at Caddy, nginx or a load balancer. Set `NEXT_PUBLIC_APP_URL`
and `BETTER_AUTH_URL` to the public HTTPS origin so callbacks and webhooks work.
Apply the security headers from `src/lib/security/headers.ts` at the proxy too
(the app sets them via `src/proxy.ts` as well).

## Backups

See `docs/BACKUP-RESTORE.md` for database backup and restore procedures.
