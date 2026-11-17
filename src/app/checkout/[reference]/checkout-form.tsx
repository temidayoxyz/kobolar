'use client'

import { useState } from 'react'

type Option = { priceId: string; label: string }

export function CheckoutForm({ options }: { options: Option[] }) {
  const [priceId, setPriceId] = useState(options[0]?.priceId ?? '')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, customerEmail: email, customerName: name || undefined }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Unable to start checkout')
      window.location.href = data.checkoutUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start checkout')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <label className="block text-sm font-medium">
        Product
        <select
          value={priceId}
          onChange={(e) => setPriceId(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          {options.map((option) => (
            <option key={option.priceId} value={option.priceId}>{option.label}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium">
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm font-medium">
        Name <span className="font-normal text-muted-foreground">(optional)</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </label>
      {error && <p className="text-sm text-error">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {pending ? 'Preparing checkout…' : 'Continue to payment →'}
      </button>
    </form>
  )
}
