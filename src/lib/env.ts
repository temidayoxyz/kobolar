import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  JOB_CRON_SECRET: z.string().min(32),
  APP_ENCRYPTION_KEY: z.string().min(32),
  EMAIL_PROVIDER: z.enum(['resend', 'sendbyte', 'smtp', 'log']).default('log'),
  EMAIL_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  DEMO_MODE: z.enum(['true', 'false']).default('false'),
})

export type Env = z.infer<typeof schema>

const DEV_DEFAULTS: Env = {
  DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/kobolar',
  BETTER_AUTH_SECRET: 'dev-only-secret-change-me-before-production-000001',
  BETTER_AUTH_URL: 'http://localhost:3000',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  JOB_CRON_SECRET: 'dev-only-cron-secret-change-me-before-production-00001',
  APP_ENCRYPTION_KEY: 'dev-only-encryption-key-change-me-before-production-0001',
  EMAIL_PROVIDER: 'log',
  EMAIL_API_KEY: undefined,
  EMAIL_FROM: undefined,
  SMTP_HOST: undefined,
  SMTP_PORT: undefined,
  SMTP_USER: undefined,
  SMTP_PASSWORD: undefined,
  DEMO_MODE: 'false',
}

/**
 * Env values are read lazily on every property access. Next.js evaluates
 * modules during compilation with an env snapshot that can differ from the
 * runtime snapshot, so a module-level constant goes stale in dev. A Proxy
 * avoids that entirely.
 *
 * In production, `assertRuntimeEnv()` validates that all required secrets are
 * present and strong. Dev defaults are non-functional for real money.
 */
export const env: Env = new Proxy({} as Env, {
  get(_target, property: keyof Env) {
    const isDev = process.env.NODE_ENV !== 'production'
    const raw = process.env[property] ?? (isDev ? DEV_DEFAULTS[property] : undefined)
    return raw
  },
  has(_target, property) {
    return property in process.env || (process.env.NODE_ENV !== 'production' && property in DEV_DEFAULTS)
  },
  ownKeys() {
    return Array.from(new Set([...Object.keys(process.env), ...Object.keys(DEV_DEFAULTS)]))
  },
  getOwnPropertyDescriptor() {
    return { enumerable: true, configurable: true }
  },
})

/** Call at runtime (health endpoint / bootstrap) to assert production config. */
export function assertRuntimeEnv(): Env {
  return schema.parse(process.env)
}

export function validateEnv(): Env {
  return assertRuntimeEnv()
}
