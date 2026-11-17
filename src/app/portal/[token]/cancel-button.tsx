'use client'

import { useState } from 'react'

export function CancelSubscriptionButton({ subscriptionId, token }: { subscriptionId: string; token: string }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function cancel() {
    if (!confirm('Cancel this subscription at the end of the current period?')) return
    setPending(true)
    setError(null)
    try {
      const response = await fetch(`/api/customer-portal/subscriptions/${subscriptionId}/cancel?token=${encodeURIComponent(token)}`, {
        method: 'POST',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Cancellation failed')
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancellation failed')
      setPending(false)
    }
  }

  return (
    <div className="text-right">
      <button
        onClick={cancel}
        disabled={pending}
        className="text-xs font-medium text-error underline disabled:opacity-60"
      >
        {pending ? 'Cancelling…' : 'Cancel subscription'}
      </button>
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  )
}
