import { departmentNames } from '@/lib/mock-data'
import { normalizeErpDepartmentKey } from '@/lib/hydrological-services-merge'

export type CanonicalDept =
  | 'hydrological'
  | 'boreholes'
  | 'financial'
  | 'hr'
  | 'compliance'

export const VALID_DEPTS: CanonicalDept[] = [
  'hydrological',
  'boreholes',
  'financial',
  'hr',
  'compliance',
]

export interface DeptStat {
  department: string
  allocated: number
  utilized: number
  availableBalance: number
  utilizationRate: number
  requisitionsCount: number
  requisitionsTotal: number
  pendingCount: number
  pendingAmount: number
}

function slugifyDept(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
}

/** True when a budget row's `department` field refers to the same dept as a canonical UI key (e.g. hydrological). */
export function financeBudgetDepartmentMatches(stored: string, targetKey: string): boolean {
  const t = normalizeErpDepartmentKey(targetKey) ?? targetKey.trim().toLowerCase()
  const canonB = toCanonicalDept(stored)
  const canonT = toCanonicalDept(t)
  if (canonB && canonT) return canonB === canonT
  if (t === 'other') return slugifyDept(stored) === 'other'
  return slugifyDept(stored) === slugifyDept(t)
}

export function displayLabelForBudgetDepartment(raw: string): string {
  const slug = slugifyDept(raw)
  const canon = toCanonicalDept(raw)
  if (canon) return departmentNames[canon] ?? raw
  if ((VALID_DEPTS as readonly string[]).includes(slug)) {
    return departmentNames[slug] ?? raw
  }
  return departmentNames[slug] ?? raw.replace(/_/g, ' ')
}

export function toCanonicalDept(raw: string): CanonicalDept | null {
  const norm = normalizeErpDepartmentKey(raw)
  if (norm) return norm
  const slug = slugifyDept(raw)
  if ((VALID_DEPTS as readonly string[]).includes(slug)) return slug as CanonicalDept
  return null
}

/** Merge rows that map to the same canonical department (e.g. duplicate labels) and fix display names. */
export function mergeDeptStatsForDgOverview(
  departments: DeptStat[]
): Array<DeptStat & { metaKey: CanonicalDept }> {
  const map = new Map<CanonicalDept, DeptStat & { metaKey: CanonicalDept }>()
  for (const d of departments) {
    const metaKey = toCanonicalDept(d.department)
    if (!metaKey) continue
    const label = displayLabelForBudgetDepartment(metaKey)
    const existing = map.get(metaKey)
    if (!existing) {
      map.set(metaKey, {
        ...d,
        department: label,
        metaKey,
        availableBalance: d.allocated - d.utilized,
        utilizationRate: d.allocated > 0 ? (d.utilized / d.allocated) * 100 : 0,
      })
    } else {
      existing.allocated += d.allocated
      existing.utilized += d.utilized
      existing.requisitionsCount += d.requisitionsCount
      existing.requisitionsTotal += d.requisitionsTotal
      existing.pendingCount += d.pendingCount
      existing.pendingAmount += d.pendingAmount
      existing.availableBalance = existing.allocated - existing.utilized
      existing.utilizationRate =
        existing.allocated > 0 ? (existing.utilized / existing.allocated) * 100 : 0
    }
  }
  return VALID_DEPTS.map((k) => map.get(k)).filter(Boolean) as Array<DeptStat & { metaKey: CanonicalDept }>
}
