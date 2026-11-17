import { NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { processJobs } from '@/lib/jobs'
import { registerJobHandlers } from '@/lib/jobs/handlers'

registerJobHandlers()

/**
 * Platform-agnostic job tick. Invoke from Cloudflare Cron Triggers, Vercel
 * Cron, Netlify Scheduled Functions, or a host crontab. No always-on worker.
 */
export async function GET(request: Request) {
  const secret = new URL(request.url).searchParams.get('secret')
  if (secret !== env.JOB_CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const processed = await processJobs(20)
  return NextResponse.json({ processed })
}
