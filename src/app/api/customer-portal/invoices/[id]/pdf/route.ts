import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { invoice } from '@/lib/db/schema'
import { verifyPortalToken } from '@/lib/portal/token'
import { generateInvoicePdf } from '@/lib/invoices/pdf'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = new URL(request.url).searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 })

  const { id } = await params
  const [doc] = await db.select().from(invoice).where(eq(invoice.id, id)).limit(1)
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const customerId = await verifyPortalToken(token)
  if (!customerId || customerId !== doc.customerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const bytes = await generateInvoicePdf(id)
  return new NextResponse(bytes as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${doc.number}.pdf"`,
    },
  })
}
