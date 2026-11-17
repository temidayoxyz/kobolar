import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { business } from '@/lib/db/schema'
import { decryptSecret } from '@/lib/crypto'
import { bachsProvider } from './bachs'
import { flutterwaveProvider } from './flutterwave'
import { paystackProvider } from './paystack'
import type { PaymentProvider, ProviderId } from './types'

export async function getBusiness() {
  const [row] = await db.select().from(business).orderBy(desc(business.createdAt)).limit(1)
  return row
}

/** Resolve the active provider with credentials decrypted from the business row.
 * Never call provider SDKs with browser-supplied credentials. */
export async function getProvider(): Promise<PaymentProvider> {
  const row = await getBusiness()
  if (!row) throw new Error('Kobolar is not configured. Complete setup first.')

  const encrypted = row.providerCredentials as Record<string, string>
  const secret = async (name: string) => {
    const value = encrypted[name]
    if (!value) throw new Error(`Missing ${name} for provider ${row.activeProvider}`)
    return decryptSecret(value)
  }

  switch (row.activeProvider as ProviderId) {
    case 'bachs':
      return bachsProvider({
        apiKey: await secret('apiKey'),
        webhookSecret: await secret('webhookSecret'),
      })
    case 'paystack':
      return paystackProvider({
        secretKey: await secret('secretKey'),
        webhookSecret: await secret('webhookSecret'),
      })
    case 'flutterwave':
      return flutterwaveProvider({
        secretKey: await secret('secretKey'),
        webhookSecret: await secret('webhookSecret'),
      })
    default:
      throw new Error(`Unsupported provider: ${row.activeProvider}`)
  }
}

export const CAPABILITIES = {
  bachs: {
    hostedCheckout: true,
    serverSideVerification: true,
    signedWebhooks: true,
    refunds: true,
    disputes: true,
    recurring: ['native'],
    currencies: ['NGN', 'USD'],
  },
  paystack: {
    hostedCheckout: true,
    serverSideVerification: true,
    signedWebhooks: true,
    refunds: true,
    disputes: true,
    recurring: ['native'],
    currencies: ['NGN', 'USD', 'GHS', 'ZAR', 'KES'],
  },
  flutterwave: {
    hostedCheckout: true,
    serverSideVerification: true,
    signedWebhooks: true,
    refunds: true,
    disputes: true,
    recurring: ['native', 'tokenized'],
    currencies: ['NGN', 'USD', 'GHS', 'KES'],
  },
} as const

export type { PaymentProvider, ProviderId } from './types'
