import { isOrgWideRole } from '@/lib/department-scope'
import { hasPermission } from '@/lib/rbac/check-permission'
import type { PlatformViewer } from '@/lib/rbac/permissions'
import type { User } from '@/lib/types'

export type ComplianceCapability =
  | 'view'
  | 'manage_cases'
  | 'manage_legal'
  | 'manage_comms'
  | 'manage_regulations'
  | 'enforce'

function viewerUser(v: PlatformViewer): User {
  return {
    id: v.id,
    email: v.email,
    name: v.name,
    role: v.role as User['role'],
    department: v.department as User['department'],
    status: v.status === 'disabled' ? 'disabled' : 'active',
    createdAt: new Date(),
  }
}

function isComplianceDept(v: PlatformViewer): boolean {
  return v.department === 'compliance'
}

function hasComplianceRead(v: PlatformViewer): boolean {
  return (
    hasPermission(v, 'compliance', 'read') ||
    hasPermission(v, 'compliance', 'export') ||
    v.platformRoles.includes('super_admin')
  )
}

function hasComplianceWrite(v: PlatformViewer): boolean {
  return (
    hasPermission(v, 'compliance', 'create') ||
    hasPermission(v, 'compliance', 'update') ||
    hasPermission(v, 'compliance', 'approve') ||
    v.platformRoles.includes('super_admin')
  )
}

export function canCompliance(viewer: PlatformViewer, cap: ComplianceCapability): boolean {
  const user = viewerUser(viewer)

  if (viewer.platformRoles.includes('super_admin')) return true

  if (cap === 'view') {
    if (isOrgWideRole(user) && hasComplianceRead(viewer)) return true
    if (isComplianceDept(viewer)) return true
    if (hasComplianceRead(viewer)) return true
    return user.role === 'dg'
  }

  if (isOrgWideRole(user) && !isComplianceDept(viewer)) {
    return false
  }

  if (!isComplianceDept(viewer) && !hasComplianceWrite(viewer)) {
    return false
  }

  switch (cap) {
    case 'manage_cases':
    case 'manage_legal':
    case 'manage_comms':
      return viewer.role === 'hod' || viewer.role === 'staff' || viewer.role === 'admin'
    case 'manage_regulations':
      return viewer.role === 'hod' || viewer.role === 'staff' || viewer.role === 'admin'
    case 'enforce':
      return viewer.role === 'hod' || viewer.role === 'staff'
    default:
      return false
  }
}

export function canAccessComplianceModule(viewer: PlatformViewer): boolean {
  return canCompliance(viewer, 'view')
}
