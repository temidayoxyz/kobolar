import { z } from 'zod'

/**
 * Runtime values are read directly so a production build never fails just
 * because deployment secrets are not present at build time. Call
 * `validateEnv()` at process start (or in a health check) to fail fast in
 * production when a required secret is missing.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(16),
  BETTER_AUTH_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  JOB_CRON_SECRET: z.string().min(16),
  APP_ENCRYPTION_KEY: z.string().min(32).optional(),
  EMAIL_PROVIDER: z.enum(['resend', 'sendbyte', 'log']).default('log'),
  EMAIL_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
})

export function validateEnv() {
  return schema.parse(process.env)
}

export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://localhost:5432/kobolar',
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? 'dev-only-secret-change-me-before-production-000001',
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  JOB_CRON_SECRET: process.env.JOB_CRON_SECRET ?? 'dev-only-cron-secret-0001',
  APP_ENCRYPTION_KEY: process.env.APP_ENCRYPTION_KEY,
  EMAIL_PROVIDER: (process.env.EMAIL_PROVIDER ?? 'log') as 'resend' | 'sendbyte' | 'log',
  EMAIL_API_KEY: process.env.EMAIL_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
}
