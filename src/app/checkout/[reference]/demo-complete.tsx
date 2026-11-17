'use client'

import { useState } from 'react'

export function DemoComplete({ reference }: { reference: string }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ portalUrl: string | null; jobsProcessed?: number } | null>(null)

  async function complete() {
    setPending(true)
    setError(null)
    try {
      const response = await fetch('/api/demo/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Demo failed')
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo failed')
    } finally {
      setPending(false)
    }
  }

  if (result) {
    return (
      <div className="mt-8 w-full rounded-xl border border-success/40 bg-success/5 p-6 text-left">
        <p className="text-sm font-medium text-success">Payment verified — order and invoice created</p>
        <p className="mt-1 text-xs text-muted-foreground">{result.jobsProcessed ?? 0} background jobs processed (receipt queued).</p>
        {result.portalUrl && (
          <a
            href={result.portalUrl}
            className="mt-4 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            View customer portal →
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="mt-8 w-full rounded-xl border border-dashed border-border bg-card p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Local demo mode</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Simulate a provider webhook to verify the payment and generate the order, invoice and receipt.
        No real money moves.
      </p>
      <button
        onClick={complete}
        disabled={pending}
        className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {pending ? 'Verifying…' : 'Complete demo payment →'}
      </button>
      {error && <p className="mt-3 text-sm text-error">{error}</p>}
    </div>
  )
}
