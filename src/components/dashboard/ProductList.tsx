'use client'

import { useState } from 'react'
import { format } from '@/lib/money'

type Row = {
  product: { id: string; name: string; description: string | null; active: boolean }
  price: { id: string; amount: string; currency: string; type: string; interval: string | null } | null
}

export function ProductList({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('NGN')
  const [type, setType] = useState<'one_time' | 'recurring'>('one_time')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, amount, currency, type, interval: type === 'recurring' ? 'month' : undefined }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Unable to create product')
      setRows([{ product: data.product, price: data.price }, ...rows])
      setName('')
      setAmount('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create product')
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <form onSubmit={create} className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold">New product</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">Name
            <input required value={name} onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-medium">Amount
            <input required pattern="^\d+(\.\d{1,4})?$" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="5000.00" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-medium">Currency
            <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-medium">Billing
            <select value={type} onChange={(e) => setType(e.target.value as 'one_time' | 'recurring')}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value="one_time">One-time</option>
              <option value="recurring">Recurring (monthly)</option>
            </select>
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-error">{error}</p>}
        <button type="submit" disabled={pending}
          className="mt-5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60">
          {pending ? 'Creating…' : 'Create product'}
        </button>
      </form>

      <div className="mt-8 space-y-2">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No products yet.</p>}
        {rows.map((row) => (
          <div key={row.product.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
            <div>
              <p className="text-sm font-medium">{row.product.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{row.price?.type ?? '—'} · {row.price?.interval ?? ''}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{row.price ? format(row.price.amount, row.price.currency) : '—'}</p>
              <p className="text-xs text-muted-foreground">{row.product.active ? 'Active' : 'Disabled'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
