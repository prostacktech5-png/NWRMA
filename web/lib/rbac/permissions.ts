export const PLATFORM_RESOURCES = [
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
] as const

export type PlatformResource = (typeof PLATFORM_RESOURCES)[number]

export const PLATFORM_ACTIONS = [
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
] as const

export type PlatformAction = (typeof PLATFORM_ACTIONS)[number]

export type PlatformPermission = `${PlatformResource}:${PlatformAction}`

export function permissionKey(
  resource: PlatformResource,
  action: PlatformAction
): PlatformPermission {
  return `${resource}:${action}`
}

export const SYSTEM_ROLE_CODES = [
  'super_admin',
  'admin',
  'regional_manager',
  'district_officer',
  'field_officer',
  'data_entry_clerk',
  'gis_officer',
  'water_quality_officer',
  'finance_officer',
  'read_only_auditor',
] as const

export type SystemRoleCode = (typeof SYSTEM_ROLE_CODES)[number]

export interface PlatformRoleRecord {
  id: string
  code: string
  name: string
  description: string | null
  isSystem: boolean
}

export interface GeoScope {
  id: string
  regionId: string | null
  districtId: string | null
  chiefdomId: string | null
}

export interface PlatformViewer {
  id: string
  email: string
  name: string
  role: string
  department: string | null
  status: string
  platformRoles: string[]
  permissions: Set<PlatformPermission>
  geoScopes: GeoScope[]
}
