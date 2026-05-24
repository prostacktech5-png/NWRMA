import { isOrgWideRole } from '@/lib/department-scope'
import type { Department, Role, User } from '@/lib/types'

const VALID_DEPARTMENTS = new Set([
  'hydrological',
  'boreholes',
  'financial',
  'hr',
  'compliance',
])

export function isValidInviteDepartment(dept: Department): dept is Exclude<Department, null> {
  return dept != null && VALID_DEPARTMENTS.has(dept)
}

/** HR & Admin department HoD — org-wide user and settings manager. */
export function isHrAdminDepartmentManager(user: User): boolean {
  return user.role === 'hod' && user.department === 'hr'
}

/** Users, Branding, Agency public forms (former platform-admin Settings). */
export function canManageOrgSettings(user: User): boolean {
  return isHrAdminDepartmentManager(user)
}

export function canViewUserDirectory(user: User): boolean {
  if (canManageOrgSettings(user)) return true
  if (user.role === 'dg') return true
  if (user.role === 'hod' && user.department) return true
  return false
}

export function canInviteUsers(user: User): boolean {
  return canManageOrgSettings(user) || (user.role === 'hod' && !!user.department)
}

export function canInviteRole(
  viewer: User,
  role: Role,
  department: Department
): boolean {
  if (role === 'admin') return false

  if (canManageOrgSettings(viewer)) {
    if (role === 'dg') return department == null
    if (role === 'hod' || role === 'staff') return isValidInviteDepartment(department)
    return false
  }

  if (viewer.role === 'hod' && viewer.department) {
    if (role !== 'staff') return false
    return department === viewer.department && isValidInviteDepartment(department)
  }

  return false
}

export type DirectoryUserTarget = {
  id: string
  role: Role
  department: Department
}

export function canListDirectoryUser(viewer: User, target: DirectoryUserTarget): boolean {
  if (canManageOrgSettings(viewer) || viewer.role === 'dg') return true
  if (viewer.role === 'hod' && viewer.department) {
    return target.id === viewer.id || target.department === viewer.department
  }
  return false
}

export function canManageDirectoryUser(
  viewer: User,
  target: { role: Role; department: Department }
): boolean {
  if (target.role === 'admin') return false
  if (canManageOrgSettings(viewer)) {
    if (target.role === 'dg') return canManageOrgSettings(viewer)
    return true
  }
  if (viewer.role === 'hod' && viewer.department) {
    return target.role === 'staff' && target.department === viewer.department
  }
  return false
}

export function roleDisplayLabel(role: Role): string {
  switch (role) {
    case 'dg':
      return 'Director General'
    case 'hod':
      return 'Head of Department'
    case 'staff':
      return 'Staff'
    case 'admin':
      return 'Administrator'
    default:
      return role
  }
}
