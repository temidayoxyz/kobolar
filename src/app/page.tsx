import Link from 'next/link'

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="space-y-4">
        <p className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
          Self-hostable billing infrastructure
        </p>
        <h1 className="font-display text-5xl font-semibold tracking-tight sm:text-6xl">
          Kobolar
        </h1>
        <p className="mx-auto max-w-xl text-lg leading-relaxed text-muted-foreground">
          Accept payments, manage subscriptions and serve customers from a single
          deployment you control. Built for African creators and developers.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/login"
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          className="rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium shadow-sm transition hover:bg-muted"
        >
          Set up Kobolar
        </Link>
      </div>
      <p className="mt-8 max-w-xl text-xs leading-relaxed text-muted-foreground">
        Kobolar provides billing and payment infrastructure. It does not make the
        installer a Merchant of Record, and it does not provide tax compliance or
        global payment acceptance. You remain responsible for your own legal, tax
        and payment-provider obligations.
      </p>
    </main>
  )
}
