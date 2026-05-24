import { canSeeDepartmentNavChild } from '@/lib/department-section-access'
import type { User } from '@/lib/types'

export const HYDROLOGICAL_APU_LIST_PATH = '/hydrological/application-processing-unit'

/** Staff who may open Application processing unit and review linked online submissions. */
export function canReviewOnlineFormApplicationsInApu(
  viewer: Pick<User, 'role' | 'department'> & {
    platformRoles?: string[]
    departmentSectionAccess?: User['departmentSectionAccess']
    hydroNavAccess?: User['hydroNavAccess']
  }
): boolean {
  if (viewer.platformRoles?.includes('super_admin')) return true
  if (viewer.role === 'admin' || viewer.role === 'dg') return true
  return canSeeDepartmentNavChild(viewer as User, HYDROLOGICAL_APU_LIST_PATH)
}
