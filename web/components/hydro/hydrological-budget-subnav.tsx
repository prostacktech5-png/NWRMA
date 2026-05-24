'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const TABS = [
  { label: 'Overview', href: '/hydrological/budget' },
  { label: 'Requisitions', href: '/hydrological/budget/requisitions' },
] as const

export function HydrologicalBudgetSubnav() {
  const pathname = usePathname()

  return (
    <nav
      className="flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1"
      aria-label="Hydrological budget sections"
    >
      {TABS.map((tab) => {
        const active =
          tab.href === '/hydrological/budget'
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
