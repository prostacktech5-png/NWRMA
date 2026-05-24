import type { Department, DepartmentSectionAccess } from '@/lib/types'

/** Legacy water_quality section ids → hydrological section ids. */
export const WATER_QUALITY_SECTION_ID_MAP: Record<string, string> = {
  'water_quality:lab_queue': 'hydrological:lab_queue',
  'water_quality:budget': 'hydrological:budget',
  'water_quality:documents': 'hydrological:documents',
  'water_quality:reports': 'hydrological:departmental_report',
  'water_quality:requests': 'hydrological:lab_queue',
}

/** Map legacy department keys to hydrological (users, finance, invites). */
export function normalizeErpDepartmentKey(
  dept: string | null | undefined
): Exclude<Department, null> | null {
  if (dept == null || dept === '') return null
  const slug = dept.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')
  if (slug === 'water_quality' || slug === 'waterquality') return 'hydrological'
  const valid: Exclude<Department, null>[] = [
    'hydrological',
    'boreholes',
    'financial',
    'hr',
    'compliance',
  ]
  if ((valid as string[]).includes(slug)) return slug as Exclude<Department, null>
  return null
}

export function migrateDepartmentSectionFlags(
  flags: Record<string, boolean> | undefined
): Record<string, boolean> {
  if (!flags) return {}
  const out: Record<string, boolean> = {}
  for (const [id, allowed] of Object.entries(flags)) {
    if (!allowed) continue
    const mapped = WATER_QUALITY_SECTION_ID_MAP[id] ?? id
    out[mapped] = true
  }
  return out
}

/** Fold legacy water_quality access into hydrological for runtime reads. */
export function migrateDepartmentSectionAccess(
  access: DepartmentSectionAccess | null | undefined
): DepartmentSectionAccess | null {
  if (!access) return null
  const hydro = {
    ...migrateDepartmentSectionFlags(access.hydrological as Record<string, boolean> | undefined),
    ...migrateDepartmentSectionFlags(
      (access as Record<string, Record<string, boolean> | undefined>).water_quality,
    ),
  }
  const out: DepartmentSectionAccess = {}
  if (Object.keys(hydro).length > 0) out.hydrological = hydro
  if (access.boreholes) out.boreholes = access.boreholes
  if (access.financial) out.financial = access.financial
  if (access.hr) out.hr = access.hr
  if (access.compliance) out.compliance = access.compliance
  return Object.keys(out).length > 0 ? out : null
}

/** Normalize finance row department field (keeps BUD-WQ-* codes unchanged). */
export function normalizeFinanceDepartmentField(department: string): string {
  const norm = normalizeErpDepartmentKey(department)
  return norm ?? department
}
