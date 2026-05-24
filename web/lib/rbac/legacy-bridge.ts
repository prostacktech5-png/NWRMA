import { canManageOrgSettings } from '@/lib/settings-access-policy'
import { legacyCanReviewLicenseApplications } from '@/lib/borehole-license-application'
import type { PlatformAction, PlatformPermission, PlatformResource } from '@/lib/rbac/permissions'
import { permissionKey } from '@/lib/rbac/permissions'
import { normalizeErpDepartmentKey } from '@/lib/hydrological-services-merge'
import type { User } from '@/lib/types'

/** Legacy ERP users without platform roles still get department-based access. */
export function legacyHasPermission(
  user: User,
  resource: PlatformResource,
  action: PlatformAction
): boolean {
  if (user.role === 'dg') {
    if (resource === 'licenses' && action === 'approve') return true
    if (resource === 'finance' && ['read', 'approve', 'export'].includes(action)) return true
    if (resource === 'audit' && action === 'read') return true
    if (resource === 'system' && action === 'read') return true
    return action === 'read' || action === 'export'
  }

  if (canManageOrgSettings(user)) {
    if (['users', 'system', 'notifications'].includes(resource)) {
      return ['read', 'update', 'manage_users', 'manage_settings'].includes(action)
    }
  }

  if (legacyCanReviewLicenseApplications(user)) {
    if (resource === 'licenses') {
      return ['read', 'update', 'approve', 'export', 'create'].includes(action)
    }
    if (resource === 'boreholes') {
      return ['read', 'update', 'approve', 'export', 'create'].includes(action)
    }
  }

  const dept = normalizeErpDepartmentKey(user.department)
  if (dept === 'hydrological' && user.role === 'hod') {
    if (['field_ops', 'gis'].includes(resource) && action === 'read') return true
  }

  if (dept === 'financial' && resource === 'finance') {
    return ['read', 'update', 'export', 'approve'].includes(action)
  }
  if (dept === 'hydrological' && resource === 'water_quality') {
    return ['read', 'update', 'export', 'approve'].includes(action)
  }
  if (dept === 'compliance' && resource === 'compliance') {
    return ['read', 'update', 'export', 'approve', 'create'].includes(action)
  }

  return false
}

export function expandLegacyPermissions(user: User): PlatformPermission[] {
  const keys: PlatformPermission[] = []
  for (const resource of [
    'boreholes',
    'licenses',
    'users',
    'gis',
    'water_quality',
    'field_ops',
    'documents',
    'finance',
    'notifications',
    'system',
    'audit',
    'api',
    'reports',
    'backup',
    'compliance',
  ] as PlatformResource[]) {
    for (const action of [
      'create',
      'read',
      'update',
      'delete',
      'approve',
      'export',
      'manage_settings',
      'manage_users',
      'manage_gis',
      'manage_payments',
    ] as PlatformAction[]) {
      if (legacyHasPermission(user, resource, action)) {
        keys.push(permissionKey(resource, action))
      }
    }
  }
  return keys
}
