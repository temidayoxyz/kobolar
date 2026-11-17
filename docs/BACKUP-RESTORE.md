# Backup and restore

Kobolar stores all business data in PostgreSQL. Invoice PDFs are generated on
demand from database rows, so a database backup is sufficient to restore a full
installation. Provider credentials are encrypted at rest in the `business`
table — back up `APP_ENCRYPTION_KEY` securely alongside the database or those
credentials cannot be decrypted after a restore.

## What must be backed up

| Item | How | Notes |
|---|---|---|
| PostgreSQL database | `pg_dump` / managed snapshots | Contains all business data |
| `APP_ENCRYPTION_KEY` | Secrets manager / password manager | Required to decrypt provider credentials |
| `BETTER_AUTH_SECRET` | Secrets manager | Session validity; rotating invalidates sessions |
| Email/Provider credentials in `.env` | Secrets manager | Also stored (encrypted) in DB for providers |

## Backup (self-host)

```bash
pg_dump -U kobolar -h localhost -Fc kobolar > kobolar-$(date +%F).dump
```

Automate with cron and ship the dump to off-site storage (S3, R2, etc.).
Managed databases (Neon, Supabase, RDS) provide point-in-time recovery — enable it.

## Restore

```bash
# Create a fresh database, then:
pg_restore -U kobolar -h localhost -d kobolar_restore kobolar-2026-11-17.dump
```

Then point `DATABASE_URL` at the restored database and restart the app. Verify:

1. Sign in — the admin account must be present.
2. Dashboard statistics load without errors.
3. A provider webhook can be received and processed (the `provider_event` counters increment).
4. Run `pnpm db:migrate` if the backup predates a recent migration — it is safe to re-run.

## Encryption key rotation (advanced)

`APP_ENCRYPTION_KEY` decrypts stored provider credentials. To rotate it:

1. Decrypt all credentials with the old key and re-encrypt with the new one via
   a one-off script (not included — write it against `src/lib/crypto.ts`).
2. Deploy the new key atomically with the re-encrypted rows.
3. Keep the old key available until all rows are migrated.

If the key is lost, provider credentials in the database are unrecoverable and
must be re-entered in Settings.

## Retention

Keep at least 7 daily and 4 weekly backups. Financial data (orders, invoices)
should be retained according to your local legal requirements.
