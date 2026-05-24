import { normalizeErpDepartmentKey } from '@/lib/hydrological-services-merge'
import type { Department, Notification, User } from '@/lib/types'

export function isOrgWideRole(user: User): boolean {
  return user.role === 'dg'
}

export function notificationsForViewer(viewer: User, list: Notification[]): Notification[] {
  return list.filter((n) => canSeeNotification(viewer, n))
}

export function canSeeNotification(viewer: User, n: Notification): boolean {
  if (isOrgWideRole(viewer)) return true
  if (n.scopeDepartment !== undefined) {
    const viewerDept = normalizeErpDepartmentKey(viewer.department ?? null)
    const scopeDept = normalizeErpDepartmentKey(n.scopeDepartment ?? null)
    return viewerDept != null && viewerDept === scopeDept
  }
  return n.userId === viewer.id
}

export type NavAccess = 'all' | 'executive' | 'super_admin' | Department

export function canSeeNavAccess(
  viewer: User,
  access: NavAccess,
  opts?: { canAccessSuperAdmin?: boolean }
): boolean {
  if (access === 'super_admin') {
    return opts?.canAccessSuperAdmin === true
  }
  if (viewer.role === 'dg') {
    return access === 'executive' || access === 'all'
  }
  if (isOrgWideRole(viewer)) return true
  if (access === 'all') return true
  if (access === 'executive') return false
  const viewerDept = normalizeErpDepartmentKey(viewer.department ?? null)
  if (access === 'hydrological' && viewerDept === 'hydrological') return true
  return viewerDept === access
}

export function canSeeNavItem(
  viewer: User,
  item: { access: NavAccess },
  opts?: { canAccessSuperAdmin?: boolean }
): boolean {
  return canSeeNavAccess(viewer, item.access, opts)
}
