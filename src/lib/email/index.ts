import nodemailer from 'nodemailer'
import { env } from '@/lib/env'

export type SendEmailInput = {
  to: string
  subject: string
  html: string
  text?: string
}

/** Interchangeable email adapter. `log` and `smtp` need no external account;
 * `resend` uses the Resend HTTP API. Sendbyte Africa can be wired by adding a
 * branch here without changing callers. */
export async function sendEmail(input: SendEmailInput): Promise<{ id: string | null }> {
  if (env.EMAIL_PROVIDER === 'log') {
    console.info('[email:log]', input.to, input.subject)
    return { id: null }
  }

  if (env.EMAIL_PROVIDER === 'smtp') {
    const port = Number(env.SMTP_PORT ?? 587)
    const transport = nodemailer.createTransport({
      host: env.SMTP_HOST ?? 'localhost',
      port,
      secure: port === 465,
      auth: env.SMTP_USER
        ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
        : undefined,
    })
    const result = await transport.sendMail({
      from: env.EMAIL_FROM ?? 'Kobolar <no-reply@kobolar.local>',
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    })
    return { id: String(result.messageId) }
  }

  if (env.EMAIL_PROVIDER === 'resend') {
    if (!env.EMAIL_API_KEY) {
      throw new Error('EMAIL_API_KEY is required when EMAIL_PROVIDER is "resend"')
    }
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

  throw new Error(`EMAIL_PROVIDER "${env.EMAIL_PROVIDER}" is not implemented`)
}
