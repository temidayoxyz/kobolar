# Deploy to Netlify

Netlify supports Next.js 16 via the official `@netlify/plugin-nextjs` plugin.

## Steps

1. Fork this repository and import it into Netlify.
2. Build command: `pnpm build`. Publish directory: `.next` (the plugin manages
   the actual output). Node version `24` is set in `netlify.toml`.
3. Add the same environment variables as the Vercel guide:
   `DATABASE_URL` (pooled), `NEXT_PUBLIC_APP_URL`, `BETTER_AUTH_URL`,
   `BETTER_AUTH_SECRET`, `JOB_CRON_SECRET`, `APP_ENCRYPTION_KEY`,
   `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM`.
4. Apply migrations before first use: `DATABASE_URL=… pnpm db:migrate`.
5. Deploy.

## Job processing / cron on Netlify

Netlify Scheduled Functions invoke a serverless function on a cron. Add a small
function that calls the tick endpoint:

```ts
// netlify/functions/tick.ts
export const handler = async () => {
  const base = process.env.NEXT_PUBLIC_APP_URL
  const secret = process.env.JOB_CRON_SECRET
  const res = await fetch(`${base}/api/cron/tick?secret=${encodeURIComponent(secret!)}`)
  return { statusCode: res.ok ? 200 : 500 }
}
```

Schedule it in `netlify.toml`:

```toml
[[functions."tick"]]
  schedule = "*/5 * * * *"
```

The function reads the secret from the environment at runtime — no secret in
source control.

## Caveats

- Function duration limits mean the tick endpoint must process a bounded batch
  (it is capped at 20 jobs per invocation — see `src/lib/jobs/index.ts`).
- Verify the `@netlify/plugin-nextjs` version supports Next.js 16 App Router
  and React Server Components before going live.
- Use a pooled Postgres connection string, as with Vercel.
