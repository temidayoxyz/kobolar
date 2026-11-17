import Link from 'next/link'

export default function CheckoutCancelPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-3xl font-semibold">Checkout cancelled</h1>
      <p className="mt-3 text-muted-foreground">No payment was taken. You can try again at any time.</p>
      <Link href="/" className="mt-8 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
        Back to home
      </Link>
    </main>
  )
}
