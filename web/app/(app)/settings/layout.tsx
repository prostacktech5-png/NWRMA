'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import { Newspaper, Palette, User, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSessionUser } from '@/components/demo-session-provider'
import { canManageOrgSettings } from '@/lib/settings-access-policy'

const adminSections = [
  { href: '/settings/branding', label: 'Branding', icon: Palette },
  { href: '/settings/website-news', label: 'Website news', icon: Newspaper },
] as const

const allRoleSections = [
  { href: '/settings/users', label: 'Users', icon: Users },
  { href: '/settings/profile', label: 'Profile', icon: User },
] as const

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useSessionUser()
  const sections = useMemo(() => {
    return canManageOrgSettings(user)
      ? [...adminSections, ...allRoleSections]
      : [...allRoleSections]
  }, [user])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Settings</h1>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 pt-4 sm:px-6">
          <nav aria-label="Settings sections" className="-mb-px flex gap-1 overflow-x-auto">
            {sections.map((section) => {
              const Icon = section.icon
              const active =
                pathname === section.href || pathname.startsWith(`${section.href}/`)
              return (
                <Link
                  key={section.href}
                  href={section.href}
                  className={cn(
                    'flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                    active
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {section.label}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  )
}
