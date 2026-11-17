import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Dashboard</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">Welcome, {session.user.name}</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        Kobolar foundation is ready. Product, checkout, order and subscription modules are
        delivered in the next phases.
      </p>
    </main>
  )
}
