import type { Department } from '@/lib/types'

export const BOREHOLES_DEPARTMENT_DISPLAY_NAME =
  'Planning, Research and Operations Department'

export const HYDROLOGICAL_SERVICES_DEPARTMENT_DISPLAY_NAME =
  'Hydrological Services Department'

/** Canonical ERP departments for invites and super-admin user creation. */
export const ERP_DEPARTMENTS: {
  value: Exclude<Department, null>
  label: string
}[] = [
  { value: 'hydrological', label: HYDROLOGICAL_SERVICES_DEPARTMENT_DISPLAY_NAME },
  { value: 'boreholes', label: BOREHOLES_DEPARTMENT_DISPLAY_NAME },
  { value: 'financial', label: 'Finance' },
  { value: 'hr', label: 'HR & Admin' },
  { value: 'compliance', label: 'Legal, Regulations & Outreach' },
]

export const ERP_ROLES = [
  { value: 'admin', label: 'Administrator' },
  { value: 'dg', label: 'Director General' },
  { value: 'hod', label: 'Head of Department' },
  { value: 'staff', label: 'Staff' },
] as const

export type ErpRoleValue = (typeof ERP_ROLES)[number]['value']

const VALID_DEPARTMENT_SET = new Set(ERP_DEPARTMENTS.map((d) => d.value))

export function isValidErpDepartment(dept: string | null | undefined): dept is Exclude<Department, null> {
  return dept != null && VALID_DEPARTMENT_SET.has(dept as Exclude<Department, null>)
}

export function departmentLabel(dept: string | null | undefined): string {
  if (!dept) return '—'
  const hit = ERP_DEPARTMENTS.find((d) => d.value === dept)
  return hit?.label ?? dept.replace(/_/g, ' ')
}

export function erpRoleLabel(role: string): string {
  const hit = ERP_ROLES.find((r) => r.value === role)
  return hit?.label ?? role
}
