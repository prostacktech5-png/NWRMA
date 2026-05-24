import type { User } from '@/lib/types'
import { firstAllowedDepartmentPath } from '@/lib/department-section-access'
import { normalizeErpDepartmentKey } from '@/lib/hydrological-services-merge'
import { isHrAdminDepartmentManager } from '@/lib/settings-access-policy'

/** Default home route for the signed-in role (login, logo link, guards). */
export function getRoleHomePath(
  user: User,
  opts?: { canAccessSuperAdmin?: boolean }
): string {
  if (opts?.canAccessSuperAdmin) return '/super-admin/dashboard'
  if (isHrAdminDepartmentManager(user) || user.role === 'admin') return '/hr'
  if (user.role === 'dg') return '/dg'
  const dept = normalizeErpDepartmentKey(user.department ?? null)
  switch (dept) {
    case 'hr':
      return '/hr'
    case 'hydrological':
      if (user.role === 'staff') return firstAllowedDepartmentPath(user)
      return '/hydrological'
    case 'boreholes':
      return '/boreholes'
    case 'financial':
      return '/finance/requisitions'
    default:
      return '/dashboard'
  }
}

/** Default in-app landing path after sign-in when no `next` query is provided. */
export function getPostLoginPath(user: User): string {
  return getRoleHomePath(user)
}
