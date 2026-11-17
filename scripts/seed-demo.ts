/** Seed the local demo database with a business config and two products.
 * Reads provider keys from .env.local — never prints them. */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { eq } from 'drizzle-orm'
import { business, price, product } from '../src/lib/db/schema'
import { encryptSecret } from '../src/lib/crypto'

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eqIdx = t.indexOf('=')
    if (eqIdx < 0) continue
    const k = t.slice(0, eqIdx).trim()
    const v = t.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    if (k && v && process.env[k] === undefined) process.env[k] = v
  }
}
loadEnvLocal()

async function main() {
  const client = postgres(process.env.DATABASE_URL!, { max: 1 })
  const db = drizzle(client)

  const apiKey = process.env.BACHS_SANDBOX_API_KEY
  const credentials: Record<string, string> = {}
  if (apiKey) {
    credentials.apiKey = await encryptSecret(apiKey)
    credentials.webhookSecret = await encryptSecret('demo_webhook_secret')
  }

  const [existing] = await db.select().from(business).limit(1)
  if (existing) {
    await db.update(business).set({ name: 'Swift Harbor', activeProvider: 'bachs', providerCredentials: credentials }).where(eq(business.id, existing.id))
  } else {
    await db.insert(business).values({
      name: 'Swift Harbor',
      slug: 'swift-harbor',
      defaultCurrency: 'USD',
      activeProvider: 'bachs',
      providerCredentials: credentials,
    })
  }

  const products = await db.select().from(product)
  if (products.length === 0) {
    const [p1] = await db.insert(product).values({
      name: 'Pro Plan',
      description: 'Monthly access to all Pro features and updates.',
      active: true,
    }).returning()
    await db.insert(price).values({
      productId: p1!.id,
      type: 'recurring',
      interval: 'month',
      amount: '29.00',
      currency: 'USD',
      active: true,
    })

    const [p2] = await db.insert(product).values({
      name: 'Starter Guide',
      description: 'A one-time digital guide to get you started.',
      active: true,
    }).returning()
    await db.insert(price).values({
      productId: p2!.id,
      type: 'one_time',
      amount: '15.00',
      currency: 'USD',
      active: true,
    })
  }

  console.log('Demo seeded: business + Pro Plan + Starter Guide')
  await client.end()
}

main().catch((error) => { console.error(error); process.exit(1) })
