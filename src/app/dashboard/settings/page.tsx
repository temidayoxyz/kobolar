import { AdminShell } from '@/components/admin/AdminShell'
import { BusinessSettings } from '@/components/dashboard/BusinessSettings'
import { getBusiness } from '@/lib/providers'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const biz = await getBusiness()
  return (
    <AdminShell title="Settings">
      <BusinessSettings
        initial={{
          name: biz?.name ?? 'My Business',
          domain: biz?.domain ?? '',
          defaultCurrency: biz?.defaultCurrency ?? 'NGN',
          activeProvider: biz?.activeProvider ?? 'bachs',
          emailFrom: biz?.emailFrom ?? '',
        }}
      />
      <div className="mt-8 max-w-2xl rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold">Webhook endpoints</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Point your provider webhook at these URLs and store the signing secret in the form above:
        </p>
        <ul className="mt-4 space-y-2 font-mono text-xs">
          <li>/api/webhooks/bachs</li>
          <li>/api/webhooks/paystack</li>
          <li>/api/webhooks/flutterwave</li>
          <li>/api/cron/tick?secret=…</li>
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          Kobolar does not provide Merchant-of-Record status, tax compliance or global payment
          acceptance. You are responsible for your own legal and tax obligations.
        </p>
      </div>
    </AdminShell>
  )
}
