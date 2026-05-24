'use client'

import { usePathname } from 'next/navigation'
import { SuperAdminAccessGate } from '@/components/super-admin/super-admin-access-gate'

const RBAC_PATH = '/super-admin/settings/rbac'

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isRbacPanel = pathname === RBAC_PATH || pathname.startsWith(`${RBAC_PATH}/`)

  return (
    <SuperAdminAccessGate>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {isRbacPanel ? 'RBAC panel' : 'Platform Administration'}
          </h1>
        </header>
        {children}
      </div>
    </SuperAdminAccessGate>
  )
}
