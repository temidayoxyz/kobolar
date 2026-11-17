import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { business } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { encryptSecret } from '@/lib/crypto'
import { getBusiness } from '@/lib/providers'

const schema = z.object({
  name: z.string().min(1).max(200).optional(),
  domain: z.string().optional(),
  defaultCurrency: z.string().length(3).optional(),
  activeProvider: z.enum(['bachs', 'paystack', 'flutterwave']).optional(),
  apiKey: z.string().optional(),
  webhookSecret: z.string().optional(),
  emailFrom: z.string().email().optional(),
})

/** Create or update the single business configuration. Credentials are
 * encrypted with AES-GCM before being stored. */
export async function PUT(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid configuration', details: parsed.error.flatten() }, { status: 422 })
  }
  const body = parsed.data

  const existing = await getBusiness()
  const credentials: Record<string, string> = { ...(existing?.providerCredentials as Record<string, string> ?? {}) }
  if (body.activeProvider === 'bachs') {
    if (body.apiKey) credentials.apiKey = await encryptSecret(body.apiKey)
    if (body.webhookSecret) credentials.webhookSecret = await encryptSecret(body.webhookSecret)
  } else if (body.activeProvider) {
    if (body.apiKey) credentials.secretKey = await encryptSecret(body.apiKey)
    if (body.webhookSecret) credentials.webhookSecret = await encryptSecret(body.webhookSecret)
  }

  const values = {
    name: body.name ?? existing?.name ?? 'My Business',
    slug: existing?.slug ?? 'my-business',
    domain: body.domain ?? existing?.domain,
    defaultCurrency: body.defaultCurrency ?? existing?.defaultCurrency ?? 'NGN',
    activeProvider: body.activeProvider ?? existing?.activeProvider ?? 'bachs',
    providerCredentials: credentials,
    emailFrom: body.emailFrom ?? existing?.emailFrom,
  }

  if (existing) {
    await db.update(business).set(values).where(eq(business.id, existing.id))
  } else {
    await db.insert(business).values(values)
  }

  return NextResponse.json({ configured: true, provider: values.activeProvider })
}
