import { BOREHOLES_DEPARTMENT_DISPLAY_NAME } from '@/lib/org-departments'
import type { PlatformAction } from '@/lib/rbac/permissions'

const RESOURCE_LABELS: Record<string, string> = {
  users: 'User Management',
  system: 'System',
  audit: 'Audit',
  boreholes: BOREHOLES_DEPARTMENT_DISPLAY_NAME,
  licenses: 'Licenses',
  gis: 'GIS',
  field_ops: 'Field Operations',
  documents: 'Documents',
  finance: 'Finance',
  notifications: 'Notifications',
  api: 'API',
  reports: 'Reports',
  backup: 'Backup',
  compliance: 'Legal, Regulations & Outreach',
}

export function resourceLabel(resource: string): string {
  return RESOURCE_LABELS[resource] ?? resource.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export type AccessTypeBadge = 'read' | 'write' | 'approve' | 'other'

export function accessTypeForAction(action: string): AccessTypeBadge {
  if (action === 'read' || action === 'export') return 'read'
  if (action === 'approve') return 'approve'
  if (
    action === 'create' ||
    action === 'update' ||
    action === 'delete' ||
    action.startsWith('manage_')
  ) {
    return 'write'
  }
  return 'other'
}

export function accessTypeLabel(type: AccessTypeBadge): string {
  switch (type) {
    case 'read':
      return 'Read'
    case 'write':
      return 'Write'
    case 'approve':
      return 'Approve'
    default:
      return 'Other'
  }
}

export function permissionDisplayName(resource: string, action: string): string {
  return `${resource}.${action}`
}

export function permissionDescription(resource: string, action: string): string {
  const r = resourceLabel(resource)
  const a = action.replace(/_/g, ' ')
  return `Allows ${a} operations in ${r}`
}

export function primaryResourceForPermissionIds(
  permissionIds: string[],
  permissions: { id: string; resource: string }[],
): string {
  if (!permissionIds.length) return '—'
  const byId = new Map(permissions.map((p) => [p.id, p.resource]))
  const resources = new Set<string>()
  for (const id of permissionIds) {
    const r = byId.get(id)
    if (r) resources.add(r)
  }
  if (resources.size === 0) return '—'
  if (resources.size === 1) return resourceLabel([...resources][0]!)
  return 'Mixed'
}
