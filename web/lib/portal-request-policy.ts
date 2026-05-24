import type { StoredPublicRequisition } from '@/lib/hydro-public-portals-stub'
import { normalizePublicReqHodWorkflow } from '@/lib/hydro-public-portals-stub'
import { VALID_DEPTS, type CanonicalDept, toCanonicalDept } from '@/lib/orgDepartments'
import type { User } from '@/lib/types'

export function canViewPortalSubmissions(user: User): boolean {
  if (user.role === 'dg') return true
  if (user.department && VALID_DEPTS.includes(user.department as CanonicalDept)) return true
  return false
}

/** HoD or admin may release a portal submission for the request's department. */
export function canReleasePortalRequest(viewer: User, requestDepartment: string): boolean {
  const reqDept = toCanonicalDept(requestDepartment)
  if (!reqDept || viewer.role !== 'hod' || !viewer.department) return false
  return viewer.department === reqDept
}

export function filterPortalRequestsForViewer(
  rows: StoredPublicRequisition[],
  viewer: User,
): StoredPublicRequisition[] {
  if (viewer.role === 'hod' && viewer.department) {
    return rows.filter((r) => toCanonicalDept(r.department) === viewer.department)
  }

  if (viewer.role === 'dg') {
    return rows.filter((r) => normalizePublicReqHodWorkflow(r) === 'released')
  }

  if (viewer.department) {
    return rows.filter(
      (r) =>
        toCanonicalDept(r.department) === viewer.department &&
        normalizePublicReqHodWorkflow(r) === 'released',
    )
  }

  return []
}

/** @deprecated Use canReleasePortalRequest */
export function canManageHydrologicalPortalHodGate(user: User): boolean {
  return user.role === 'hod' && user.department === 'hydrological'
}
