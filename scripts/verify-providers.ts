/**
 * Provider sandbox verification harness.
 *
 * Usage:
 *   pnpm verify:providers            # offline: run the fixture test suite
 *   pnpm verify:providers -- --live  # also call provider sandbox APIs
 *
 * Live mode requires sandbox/test credentials in the environment:
 *   BACHS_SANDBOX_API_KEY   (sk_sandbox_...)
 *   PAYSTACK_TEST_SECRET_KEY (sk_test_...)
 *   FLW_TEST_SECRET_KEY
 *
 * Never use live keys. The script refuses keys that are not sandbox/test.
 * No secret values are printed.
 */
import { execSync } from 'node:child_process'

const isLive = process.argv.includes('--live')

function mask(value: string): string {
  return `${value.slice(0, 8)}…${value.slice(-4)}`
}

type CheckResult = { provider: string; ok: boolean; detail: string }

async function requestJson(url: string, options: RequestInit): Promise<{ status: number; body: unknown }> {
  const response = await fetch(url, { ...options, cache: 'no-store' })
  const text = await response.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  return { status: response.status, body }
}

async function verifyBachs(key: string): Promise<CheckResult> {
  if (!key.startsWith('sk_sandbox_')) {
    return { provider: 'bachs', ok: false, detail: 'expected a sk_sandbox_ key' }
  }
  try {
    const { status, body } = await requestJson('https://sandbox-api.bachs.io/v1/checkout-sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pricing: { currency: 'USD', amount: '1.00' },
        customer: { email: 'verify@kobolar.local' },
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        reference: `kbo_verify_${Date.now()}`,
      }),
    })
    const data = body as { checkout_url?: string; checkout_id?: string }
    const ok = status === 200 && typeof data.checkout_url === 'string'
    return { provider: 'bachs', ok, detail: ok ? `checkout_id=${data.checkout_id}` : `status=${status} body=${JSON.stringify(body).slice(0, 200)}` }
  } catch (error) {
    return { provider: 'bachs', ok: false, detail: error instanceof Error ? error.message : String(error) }
  }
}

async function verifyPaystack(key: string): Promise<CheckResult> {
  if (!key.startsWith('sk_test_')) {
    return { provider: 'paystack', ok: false, detail: 'expected a sk_test_ key' }
  }
  try {
    const { status, body } = await requestJson('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'verify@kobolar.local',
        amount: 100,
        currency: 'NGN',
        reference: `kbo_verify_${Date.now()}`,
      }),
    })
    const data = body as { status?: boolean; data?: { authorization_url?: string; reference?: string } }
    const ok = status === 200 && data.status === true && typeof data.data?.authorization_url === 'string'
    return { provider: 'paystack', ok, detail: ok ? `reference=${data.data?.reference}` : `status=${status} body=${JSON.stringify(body).slice(0, 200)}` }
  } catch (error) {
    return { provider: 'paystack', ok: false, detail: error instanceof Error ? error.message : String(error) }
  }
}

async function verifyFlutterwave(key: string): Promise<CheckResult> {
  // Flutterwave test keys are typically FLWSECK_TEST-...
  if (!key.includes('TEST')) {
    return { provider: 'flutterwave', ok: false, detail: 'expected a TEST key' }
  }
  try {
    const { status, body } = await requestJson('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 100,
        currency: 'NGN',
        tx_ref: `kbo_verify_${Date.now()}`,
        customer: { email: 'verify@kobolar.local' },
        redirect_url: 'https://example.com/success',
      }),
    })
    const data = body as { status?: string; data?: { link?: string } }
    const ok = status === 200 && data.status === 'success' && typeof data.data?.link === 'string'
    return { provider: 'flutterwave', ok, detail: ok ? 'hosted link returned' : `status=${status} body=${JSON.stringify(body).slice(0, 200)}` }
  } catch (error) {
    return { provider: 'flutterwave', ok: false, detail: error instanceof Error ? error.message : String(error) }
  }
}

function runOfflineSuite() {
  console.log('Running offline fixture + normalization suite…')
  try {
    execSync('pnpm vitest run tests/provider-verification.test.ts tests/webhooks.test.ts tests/subscriptions.test.ts', {
      stdio: 'inherit',
    })
    return true
  } catch {
    return false
  }
}

async function main() {
  console.log('Kobolar provider verification')
  const offlineOk = runOfflineSuite()

  if (!isLive) {
    console.log('\nOffline checks complete. To verify against provider sandboxes, set test keys and run with -- --live')
    process.exit(offlineOk ? 0 : 1)
  }

  console.log('\nLive sandbox checks (creating test checkouts only — no payments are captured)…')
  const results: CheckResult[] = []

  if (process.env.BACHS_SANDBOX_API_KEY) {
    console.log(`  Bachs key: ${mask(process.env.BACHS_SANDBOX_API_KEY)}`)
    results.push(await verifyBachs(process.env.BACHS_SANDBOX_API_KEY))
  } else {
    results.push({ provider: 'bachs', ok: false, detail: 'BACHS_SANDBOX_API_KEY not set' })
  }

  if (process.env.PAYSTACK_TEST_SECRET_KEY) {
    console.log(`  Paystack key: ${mask(process.env.PAYSTACK_TEST_SECRET_KEY)}`)
    results.push(await verifyPaystack(process.env.PAYSTACK_TEST_SECRET_KEY))
  } else {
    results.push({ provider: 'paystack', ok: false, detail: 'PAYSTACK_TEST_SECRET_KEY not set' })
  }

  if (process.env.FLW_TEST_SECRET_KEY) {
    console.log(`  Flutterwave key: ${mask(process.env.FLW_TEST_SECRET_KEY)}`)
    results.push(await verifyFlutterwave(process.env.FLW_TEST_SECRET_KEY))
  } else {
    results.push({ provider: 'flutterwave', ok: false, detail: 'FLW_TEST_SECRET_KEY not set' })
  }

  console.log('\nResults:')
  for (const result of results) {
    console.log(`  ${result.ok ? 'PASS' : 'FAIL'}  ${result.provider}: ${result.detail}`)
  }

  const allOk = offlineOk && results.every((r) => r.ok)
  console.log(`\n${allOk ? 'All provider checks passed.' : 'Some checks failed — review before enabling a provider.'}`)
  process.exit(allOk ? 0 : 1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
