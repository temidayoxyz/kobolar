import Link from 'next/link'

const NAV = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/products', label: 'Products' },
  { href: '/dashboard/customers', label: 'Customers' },
  { href: '/dashboard/orders', label: 'Orders' },
  { href: '/dashboard/subscriptions', label: 'Subscriptions' },
  { href: '/dashboard/settings', label: 'Settings' },
]

export function AdminShell({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 w-56 border-r border-border bg-card px-4 py-6">
        <Link href="/dashboard" className="font-display text-xl font-semibold">Kobolar</Link>
        <nav className="mt-8 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <p className="absolute bottom-6 left-4 text-xs text-muted-foreground">Self-hosted billing</p>
      </aside>
      <main className="ml-56 px-10 py-10">
        <h1 className="font-display text-3xl font-semibold">{title}</h1>
        <div className="mt-8">{children}</div>
      </main>
    </div>
  )
}
