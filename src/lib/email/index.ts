import { env } from '@/lib/env'

export type SendEmailInput = {
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Interchangeable email adapter. The default `log` provider writes to stdout
 * so local development and self-hosting need no external service. Swap in
 * Resend or Sendbyte Africa by setting EMAIL_PROVIDER and EMAIL_API_KEY.
 */
export async function sendEmail(input: SendEmailInput): Promise<{ id: string | null }> {
  if (env.EMAIL_PROVIDER === 'log') {
    console.info('[email:log]', input.to, input.subject)
    return { id: null }
  }

  if (!env.EMAIL_API_KEY) {
    throw new Error('EMAIL_API_KEY is required when EMAIL_PROVIDER is not "log"')
  }

  if (env.EMAIL_PROVIDER === 'resend') {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.EMAIL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM ?? 'Kobolar <onboarding@resend.dev>',
        to: [input.to],
        subject: input.subject,
        html: input.html,
      }),
    })
    if (!res.ok) throw new Error(`Resend error: ${res.status} ${await res.text()}`)
    const data = (await res.json()) as { id: string }
    return { id: data.id }
  }

  throw new Error(`EMAIL_PROVIDER "${env.EMAIL_PROVIDER}" is not implemented yet`)
}
