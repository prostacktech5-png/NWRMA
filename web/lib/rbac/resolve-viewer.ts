import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import {
  loadUserGeoScopes,
  loadUserPermissions,
  loadUserPlatformRoles,
  loadUserSecurityFields,
} from '@/lib/db/rbac-persistence'
import { expandLegacyPermissions } from '@/lib/rbac/legacy-bridge'
import type {
  PlatformAction,
  PlatformPermission,
  PlatformResource,
  PlatformViewer,
} from '@/lib/rbac/permissions'
import { permissionKey } from '@/lib/rbac/permissions'

export {
  canAccessSuperAdmin,
  hasPermission,
  platformViewerToUser,
} from '@/lib/rbac/check-permission'

export async function resolvePlatformViewerFromRequest(
  req: Request
): Promise<PlatformViewer | null> {
  const user = await resolveDemoViewerFromRequest(req)
  if (!user) return null

  const [platformRoles, permissions, geoScopes, security] = await Promise.all([
    loadUserPlatformRoles(user.id),
    loadUserPermissions(user.id),
    loadUserGeoScopes(user.id),
    loadUserSecurityFields(user.id),
  ])

  if (security.deletedAt) return null
  if (security.status === 'disabled') return null
  if (security.lockedUntil && security.lockedUntil > new Date()) return null

  const merged = new Set(permissions)
  if (platformRoles.length === 0) {
    for (const p of expandLegacyPermissions(user)) merged.add(p)
  }
  if (platformRoles.includes('super_admin')) {
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
        merged.add(permissionKey(resource, action))
      }
    }
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    department: user.department,
    status: security.status,
    platformRoles,
    permissions: merged,
    geoScopes,
  }
}
