import Link from 'next/link'
import { DemoComplete } from '../demo-complete'

export default async function CheckoutSuccessPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params
  const demo = process.env.NODE_ENV !== 'production' && process.env.DEMO_MODE === 'true'

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-2xl text-success">✓</div>
      <h1 className="mt-6 font-display text-3xl font-semibold">Payment submitted</h1>
      <p className="mt-3 text-muted-foreground">
        We are verifying your payment. Your receipt and invoice will be available in your
        customer portal shortly.
      </p>
      <p className="mt-4 font-mono text-xs text-muted-foreground">Reference: {reference}</p>

      {demo ? (
        <DemoComplete reference={reference} />
      ) : (
        <Link href="/" className="mt-8 rounded-lg border border-border px-5 py-2.5 text-sm font-medium">
          Back to home
        </Link>
      )}
    </main>
  )
}
