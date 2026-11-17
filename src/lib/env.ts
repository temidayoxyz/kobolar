import { z } from 'zod'

const optionalUrl = z.string().url().optional()

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: optionalUrl,
  NEXT_PUBLIC_APP_URL: optionalUrl,
  JOB_CRON_SECRET: z.string().min(32),
  APP_ENCRYPTION_KEY: z.string().min(32),
  EMAIL_PROVIDER: z.enum(['resend', 'sendbyte', 'log']).default('log'),
  EMAIL_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
})

const DEV_DEFAULTS = {
  DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/kobolar',
  BETTER_AUTH_SECRET: 'dev-only-secret-change-me-before-production-000001',
  BETTER_AUTH_URL: 'http://localhost:3000',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  JOB_CRON_SECRET: 'dev-only-cron-secret-change-me-before-production-00001',
  APP_ENCRYPTION_KEY: 'dev-only-encryption-key-change-me-before-production-0001',
  EMAIL_PROVIDER: 'log' as const,
  EMAIL_API_KEY: undefined as string | undefined,
  EMAIL_FROM: undefined as string | undefined,
}

/** `next build` runs with NODE_ENV=production but without runtime secrets, so
 * we must not fail the build for missing env vars. We enforce them at runtime
 * in a health check instead (see `assertRuntimeEnv`). */
const isBuildPhase =
  process.env.NEXT_PHASE === 'phase-production-build' ||
  process.env.NEXT_PHASE === 'phase-development-server' ||
  process.env.NEXT_PHASE === 'phase-production-server'

/** Reads env values. Dev defaults are non-functional for real money and are
 * never used in a correctly configured production runtime. */
export const env = (() => {
  const source = process.env.NODE_ENV === 'production' && !isBuildPhase
    ? process.env
    : { ...DEV_DEFAULTS, ...process.env }

  const parsed = schema.safeParse(source)
  if (!parsed.success) {
    if (process.env.NODE_ENV === 'production' && !isBuildPhase) {
      throw new Error(`Invalid production environment: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')}`)
    }
    return { ...DEV_DEFAULTS } as z.infer<typeof schema>
  }
  return parsed.data
})()

/** Call at runtime (e.g. in a health endpoint or request bootstrap) to assert
 * the deployment is configured for production. */
export function assertRuntimeEnv() {
  return schema.parse(process.env)
}

export function validateEnv() {
  return assertRuntimeEnv()
}
