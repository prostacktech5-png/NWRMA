/** Canonical job titles (platform officer roles, excluding Super Admin). */

const PLATFORM_ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  regional_manager: 'Regional Manager',
  district_officer: 'District Officer',
  field_officer: 'Field Officer',
  data_entry_clerk: 'Data Entry Clerk',
  gis_officer: 'GIS Officer',
  water_quality_officer: 'Water Quality Officer',
  finance_officer: 'Finance Officer',
  read_only_auditor: 'Read-only Auditor',
}

export const JOB_TITLES: { value: string; label: string }[] = Object.entries(
  PLATFORM_ROLE_LABELS,
)
  .filter(([code]) => code !== 'super_admin')
  .map(([, label]) => ({ value: label, label }))

const VALID_JOB_TITLE_SET = new Set(JOB_TITLES.map((t) => t.value))

export function isValidJobTitle(title: string | null | undefined): boolean {
  if (!title?.trim()) return false
  return VALID_JOB_TITLE_SET.has(title.trim())
}

export function jobTitleLabel(value: string | null | undefined): string {
  if (!value?.trim()) return '—'
  return value.trim()
}

export type AdminUserStatus = 'active' | 'disabled'

export function isValidAdminUserStatus(status: string): status is AdminUserStatus {
  return status === 'active' || status === 'disabled'
}

export function adminUserStatusLabel(status: string): string {
  if (status === 'disabled') return 'Blocked'
  return 'Active'
}
