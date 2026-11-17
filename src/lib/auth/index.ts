import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { env } from '@/lib/env'
import { sendEmail } from '@/lib/email'

export const auth = betterAuth({
  appName: 'Kobolar',
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      '/signIn/email': { window: 60, max: 10 },
      '/signUp/email': { window: 60, max: 5 },
      '/requestPasswordReset': { window: 60, max: 5 },
      '/sendVerificationEmail': { window: 60, max: 5 },
    },
  },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL ?? env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: 'Reset your Kobolar password',
        html: `<p>Follow this link to reset your password:</p><p><a href="${url}">Reset password</a></p>`,
        text: `Reset your password: ${url}`,
      })
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: 'Verify your Kobolar email',
        html: `<p>Verify your email address:</p><p><a href="${url}">Verify email</a></p>`,
        text: `Verify your email: ${url}`,
      })
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
})

export type Session = typeof auth.$Infer.Session
