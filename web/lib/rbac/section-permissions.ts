import {
  EXCLUDED_PLATFORM_RESOURCES,
  findSectionById,
  getAllDepartmentSections,
  getSectionsForDepartment,
  type DepartmentSection,
} from '@/lib/rbac/department-sections'
import type { Department } from '@/lib/types'

export type PermissionRow = { id: string; resource: string; action: string }

/** Platform resources included when a department section is enabled (role permission expansion). */
const SECTION_RESOURCES: Record<string, string[]> = {
  'hydrological:readings': ['field_ops'],
  'hydrological:monitoring': ['field_ops', 'reports'],
  'hydrological:budget': ['finance'],
  'hydrological:departmental_report': ['reports'],
  'hydrological:documents': ['documents'],
  'hydrological:lab_queue': ['water_quality'],
  'hydrological:application_processing': ['compliance', 'documents', 'finance'],
  'boreholes:registry': ['boreholes'],
  'boreholes:license_applications': ['boreholes', 'licenses'],
  'boreholes:companies': ['boreholes'],
  'boreholes:survey123': ['boreholes'],
  'boreholes:budget': ['finance'],
  'boreholes:reports': ['reports'],
  'boreholes:documents': ['documents'],
  'financial:payments': ['finance'],
  'financial:bank_receipt_validation': ['finance'],
  'financial:requisitions': ['finance'],
  'financial:budgets': ['finance'],
  'financial:summary': ['finance'],
  'financial:reports': ['reports'],
  'financial:documents': ['documents'],
  'hr:dashboard': ['documents'],
  'hr:staff': ['documents'],
  'hr:assets': ['documents'],
  'hr:payroll': ['finance'],
  'hr:subscriptions': ['documents'],
  'hr:birthdays': ['documents'],
  'hr:leave': ['documents'],
  'hr:requisitions': ['finance'],
  'hr:reports': ['reports'],
  'hr:documents': ['documents'],
  'compliance:dashboard': ['compliance'],
  'compliance:register': ['compliance'],
  'compliance:legal': ['compliance', 'documents'],
  'compliance:outreach': ['compliance', 'documents'],
  'compliance:regulations': ['compliance', 'licenses', 'documents'],
  'compliance:budget': ['finance'],
  'compliance:reports': ['reports'],
  'compliance:documents': ['documents'],
}

const DEPARTMENT_FALLBACK_RESOURCES: Record<Exclude<Department, null>, string[]> = {
  hydrological: ['field_ops', 'finance', 'reports', 'documents', 'water_quality'],
  boreholes: ['boreholes', 'licenses', 'documents'],
  financial: ['finance', 'documents'],
  hr: ['documents', 'finance', 'reports'],
  compliance: ['compliance', 'documents', 'licenses', 'reports'],
}

export function filterPermissionsForRbacUi(permissions: PermissionRow[]): PermissionRow[] {
  return permissions.filter((p) => !EXCLUDED_PLATFORM_RESOURCES.has(p.resource))
}

export function resourcesForDepartment(dept: Exclude<Department, null>): string[] {
  return DEPARTMENT_FALLBACK_RESOURCES[dept] ?? []
}

export function permissionsForDepartment(
  dept: Exclude<Department, null>,
  permissions: PermissionRow[],
): PermissionRow[] {
  const allowed = new Set(resourcesForDepartment(dept))
  return filterPermissionsForRbacUi(permissions).filter((p) => allowed.has(p.resource))
}

export function permissionsForSection(
  sectionId: string,
  permissions: PermissionRow[],
): PermissionRow[] {
  const resources = new Set(SECTION_RESOURCES[sectionId] ?? [])
  if (!resources.size) return []
  return filterPermissionsForRbacUi(permissions).filter((p) => resources.has(p.resource))
}

export function permissionIdsForSections(
  sectionIds: string[],
  permissions: PermissionRow[],
): string[] {
  const ids = new Set<string>()
  for (const sid of sectionIds) {
    for (const p of permissionsForSection(sid, permissions)) {
      ids.add(p.id)
    }
  }
  return [...ids]
}

export function sectionsFromPermissionIds(
  permissionIds: string[],
  permissions: PermissionRow[],
): string[] {
  const idSet = new Set(permissionIds)
  const enabled = filterPermissionsForRbacUi(permissions).filter((p) => idSet.has(p.id))
  const resources = new Set(enabled.map((p) => p.resource))
  const sectionIds: string[] = []
  for (const section of getAllDepartmentSections()) {
    const sectionRes = SECTION_RESOURCES[section.id] ?? []
    if (sectionRes.length > 0 && sectionRes.every((r) => resources.has(r))) {
      sectionIds.push(section.id)
    }
  }
  return sectionIds
}

export function sectionIdsForDepartment(
  dept: Exclude<Department, null>,
  permissionIds: string[],
  permissions: PermissionRow[],
): string[] {
  const deptPerms = permissionsForDepartment(dept, permissions)
  const deptPermIds = new Set(deptPerms.map((p) => p.id))
  const selected = permissionIds.filter((id) => deptPermIds.has(id))
  return sectionsFromPermissionIds(selected, permissions).filter((sid) => {
    const s = findSectionById(sid)
    return s?.department === dept
  })
}

export function groupedPermissionsByDepartmentSection(
  dept: Exclude<Department, null>,
  permissions: PermissionRow[],
): { section: DepartmentSection; permissions: PermissionRow[] }[] {
  return getSectionsForDepartment(dept).map((section) => ({
    section,
    permissions: permissionsForSection(section.id, permissions),
  }))
}

export function departmentPermissionGroupCount(): number {
  return 5
}
