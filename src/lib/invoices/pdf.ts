import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { db } from '@/lib/db'
import { business as businessTable, customer, invoice, order } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { format } from '@/lib/money'

/** Generate a simple, dependency-light PDF invoice. PDFs are later uploaded
 * to object storage; here we return bytes so any storage adapter can persist. */
export async function generateInvoicePdf(invoiceId: string): Promise<Uint8Array> {
  const [doc] = await db.select().from(invoice).where(eq(invoice.id, invoiceId)).limit(1)
  if (!doc) throw new Error('Invoice not found')

  const [biz] = await db.select().from(businessTable).limit(1)
  const [orderRow] = await db.select().from(order).where(eq(order.id, doc.orderId)).limit(1)
  const [customerRow] = await db.select().from(customer).where(eq(customer.id, doc.customerId)).limit(1)

  const pdf = await PDFDocument.create()
  const page = pdf.addPage([595, 842]) // A4
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const charcoal = rgb(0.16, 0.16, 0.16)
  const grey = rgb(0.45, 0.45, 0.43)
  page.drawText('KOBOLAR', { x: 48, y: 790, size: 20, font: bold, color: charcoal })
  page.drawText('INVOICE', { x: 48, y: 740, size: 28, font: bold, color: charcoal })
  page.drawText(doc.number, { x: 48, y: 716, size: 12, font: regular, color: grey })

  page.drawText(`From: ${biz?.name ?? 'Kobolar'}`, { x: 48, y: 670, size: 11, font: regular, color: charcoal })
  page.drawText(`Bill to: ${customerRow?.name ?? customerRow?.email ?? 'Customer'}`, { x: 48, y: 650, size: 11, font: regular, color: charcoal })
  page.drawText(`Email: ${customerRow?.email ?? ''}`, { x: 48, y: 632, size: 11, font: regular, color: grey })
  page.drawText(`Date: ${new Date(doc.createdAt).toLocaleDateString()}`, { x: 48, y: 614, size: 11, font: regular, color: grey })

  page.drawText('Description', { x: 48, y: 540, size: 11, font: bold, color: grey })
  page.drawText(`Order ${orderRow?.number ?? ''}`, { x: 48, y: 518, size: 12, font: regular, color: charcoal })
  page.drawText('Amount', { x: 420, y: 540, size: 11, font: bold, color: grey })
  page.drawText(format(doc.amount, doc.currency), { x: 420, y: 518, size: 12, font: regular, color: charcoal })

  page.drawLine({ start: { x: 48, y: 500 }, end: { x: 547, y: 500 }, thickness: 1, color: rgb(0.85, 0.83, 0.78) })
  page.drawText('Total', { x: 420, y: 476, size: 13, font: bold, color: charcoal })
  page.drawText(format(doc.amount, doc.currency), { x: 420, y: 454, size: 13, font: bold, color: charcoal })
  page.drawText(`Status: ${doc.status}`, { x: 48, y: 454, size: 11, font: regular, color: grey })

  page.drawText('Thank you for your business.', { x: 48, y: 80, size: 10, font: regular, color: grey })

  return pdf.save()
}
