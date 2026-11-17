'use client'

import { useState } from 'react'

type Initial = {
  name: string
  domain: string
  defaultCurrency: string
  activeProvider: string
  emailFrom: string
}

export function BusinessSettings({ initial }: { initial: Initial }) {
  const [form, setForm] = useState(initial)
  const [apiKey, setApiKey] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function update(key: keyof Initial, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    setMessage(null)
    try {
      const body: Record<string, string> = {
        name: form.name,
        domain: form.domain,
        defaultCurrency: form.defaultCurrency,
        activeProvider: form.activeProvider,
        emailFrom: form.emailFrom,
      }
      if (apiKey) body.apiKey = apiKey
      if (webhookSecret) body.webhookSecret = webhookSecret

      const response = await fetch('/api/admin/business', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Unable to save settings')
      setMessage('Settings saved. Credentials are encrypted at rest.')
      setApiKey('')
      setWebhookSecret('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save settings')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={save} className="max-w-2xl rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="font-display text-lg font-semibold">Business configuration</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Credentials are encrypted and never sent to the browser.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Business name
          <input required value={form.name} onChange={(e) => update('name', e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </label>
        <label className="text-sm font-medium">Domain
          <input value={form.domain} onChange={(e) => update('domain', e.target.value)} placeholder="https://example.com"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </label>
        <label className="text-sm font-medium">Default currency
          <input value={form.defaultCurrency} onChange={(e) => update('defaultCurrency', e.target.value.toUpperCase())}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </label>
        <label className="text-sm font-medium">Email from
          <input type="email" value={form.emailFrom} onChange={(e) => update('emailFrom', e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </label>
        <label className="text-sm font-medium">Payment provider
          <select value={form.activeProvider} onChange={(e) => update('activeProvider', e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="bachs">Bachs</option>
            <option value="paystack">Paystack</option>
            <option value="flutterwave">Flutterwave</option>
          </select>
        </label>
      </div>

      <div className="mt-6 border-t border-border pt-6">
        <h3 className="font-medium">Provider credentials</h3>
        <p className="mt-1 text-xs text-muted-foreground">Leave blank to keep the existing value.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">API secret key
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} autoComplete="off"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-medium">Webhook secret
            <input type="password" value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} autoComplete="off"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </label>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-error">{error}</p>}
      {message && <p className="mt-4 text-sm text-success">{message}</p>}
      <button type="submit" disabled={pending}
        className="mt-6 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60">
        {pending ? 'Saving…' : 'Save settings'}
      </button>
    </form>
  )
}
