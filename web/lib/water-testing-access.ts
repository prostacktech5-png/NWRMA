import { staffCanAccessDepartmentPath } from '@/lib/department-section-access'
import { normalizeErpDepartmentKey } from '@/lib/hydrological-services-merge'
import { staffCanAccessHydroPath } from '@/lib/hydro-nav-access'
import { isOrgWideRole } from '@/lib/department-scope'
import type { User } from '@/lib/types'

const WATER_TESTING_PATH = '/hydrological/water-testing'

export function canManageWaterTestingRequests(user: User): boolean {
  if (isOrgWideRole(user)) return true
  if (user.role === 'hod' && normalizeErpDepartmentKey(user.department) === 'hydrological') {
    return true
  }
  if (user.role === 'staff') {
    return (
      staffCanAccessDepartmentPath(user, WATER_TESTING_PATH) ||
      staffCanAccessHydroPath(user, WATER_TESTING_PATH)
    )
  }
  return false
}
