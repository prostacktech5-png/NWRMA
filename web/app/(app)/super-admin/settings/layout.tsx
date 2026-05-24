'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

const HUB_PATH = '/super-admin/settings'

export default function SuperAdminSettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isHub = pathname === HUB_PATH

  return (
    <div className="space-y-6">
      <div>
        {!isHub ? (
          <Link
            href={HUB_PATH}
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Link>
        ) : null}
        {isHub ? (
          <>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Settings</h2>
          </>
        ) : null}
      </div>
      {children}
    </div>
  )
}
