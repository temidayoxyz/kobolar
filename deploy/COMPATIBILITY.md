# Deployment compatibility matrix

Kobolar runs as one Next.js application. No always-on worker is required.

| Concern | Cloudflare | Vercel | Netlify | Self-host |
|---|---|---|---|---|
| Runtime | Workers via OpenNext | Native Next.js | Native Next.js | `next start` or optional Docker |
| RSC / SSR | Supported | Supported | Supported | Supported |
| Postgres | Neon HTTP / Hyperdrive | Neon / Supabase / RDS | Neon / Supabase | Any Postgres |
| Connections | Pooled HTTP | Pooled | Pooled | PgBouncer recommended |
| Job tick | Cron Trigger → `/api/cron/tick` | Vercel Cron | Scheduled Function | crontab / systemd timer |
| Object storage | R2 | S3/R2 | S3/R2 | MinIO / S3 |
| Large files (>25 MB) | R2 | S3 | S3 | Local S3/MinIO |
| Email | Resend / Sendbyte | Resend / Sendbyte | Resend / Sendbyte | Any adapter |

## Deploy steps

1. Fork the repository.
2. Create a Postgres database.
3. Set environment variables from `.env.example`.
4. Deploy the app.
5. Run `pnpm db:migrate` (or the platform's release command).
6. Open `/register` to create the administrator account.
7. Configure the business and connect a payment provider in the dashboard.

## Notes

- Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the final public origin.
- Cron tick requests must include `?secret=$JOB_CRON_SECRET`.
- Provider credentials are stored encrypted (`APP_ENCRYPTION_KEY`).
