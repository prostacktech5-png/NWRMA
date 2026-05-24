import type {
  PlatformAction,
  PlatformPermission,
  PlatformResource,
  PlatformViewer,
} from '@/lib/rbac/permissions'
import { permissionKey } from '@/lib/rbac/permissions'
import type { User } from '@/lib/types'

/** Client-safe permission check (no database imports). */
export function hasPermission(
  viewer: PlatformViewer,
  resource: PlatformResource,
  action: PlatformAction
): boolean {
  return viewer.permissions.has(permissionKey(resource, action))
}

export function canAccessSuperAdmin(viewer: PlatformViewer): boolean {
  return (
    viewer.platformRoles.includes('super_admin') ||
    hasPermission(viewer, 'system', 'read') ||
    hasPermission(viewer, 'audit', 'read')
  )
}

export function platformViewerToUser(viewer: PlatformViewer): User {
  return {
    id: viewer.id,
    email: viewer.email,
    name: viewer.name,
    role: viewer.role as User['role'],
    department: viewer.department as User['department'],
    status: viewer.status === 'disabled' ? 'disabled' : 'active',
    createdAt: new Date(),
  }
}

/** Build minimal viewer for permission checks when only roles/permissions are known (e.g. client). */
export function viewerFromSessionFields(fields: {
  id: string
  email: string
  name: string
  role: string
  department: string | null
  platformRoles?: string[]
  permissions?: Iterable<PlatformPermission>
}): PlatformViewer {
  return {
    id: fields.id,
    email: fields.email,
    name: fields.name,
    role: fields.role,
    department: fields.department,
    status: 'active',
    platformRoles: fields.platformRoles ?? [],
    permissions: new Set(fields.permissions ?? []),
    geoScopes: [],
  }
}
