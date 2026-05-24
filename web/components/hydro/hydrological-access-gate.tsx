'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSessionUser } from '@/components/demo-session-provider'
import { staffCanAccessDepartmentPath } from '@/lib/department-section-access'
import { normalizeErpDepartmentKey } from '@/lib/hydrological-services-merge'
import {
  firstAllowedHydroPath,
  hydroPathToAccessKey,
  staffCanAccessHydroPath,
} from '@/lib/hydro-nav-access'
import { firstAllowedDepartmentPath } from '@/lib/department-section-access'

function firstAllowedHydrologicalPath(user: Parameters<typeof staffCanAccessHydroPath>[0]) {
  const deptPath = firstAllowedDepartmentPath(user)
  if (deptPath.startsWith('/hydrological')) return deptPath
  return firstAllowedHydroPath(user)
}

export function HydrologicalAccessGate({ children }: { children: React.ReactNode }) {
  const { user } = useSessionUser()
  const pathname = usePathname()
  const router = useRouter()

  const isHsdStaff = normalizeErpDepartmentKey(user.department) === 'hydrological' && user.role === 'staff'
  const hydroKey = hydroPathToAccessKey(pathname)
  const allowed = isHsdStaff
    ? hydroKey != null
      ? staffCanAccessHydroPath(user, pathname)
      : staffCanAccessDepartmentPath(user, pathname)
    : staffCanAccessHydroPath(user, pathname)

  useEffect(() => {
    if (!allowed) {
      router.replace(firstAllowedHydrologicalPath(user))
    }
  }, [allowed, router, user])

  if (!allowed) {
    return <div className="text-muted-foreground p-6 text-sm">Checking access…</div>
  }
  return <>{children}</>
}
