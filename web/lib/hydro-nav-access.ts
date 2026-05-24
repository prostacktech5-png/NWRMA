import { normalizeErpDepartmentKey } from '@/lib/hydrological-services-merge'
import type { HydroNavAccess, HydroNavAccessKey, User } from '@/lib/types'

export const HYDRO_NAV_ACCESS_KEYS = [
  'readings',
  'monitoring',
  'lab_queue',
  'budget',
  'departmental_report',
] as const satisfies readonly HydroNavAccessKey[]

export const HYDRO_NAV_ACCESS_LABELS: Record<HydroNavAccessKey, string> = {
  readings: 'Water level reading',
  monitoring: 'Flood forecasting',
  budget: 'Budget',
  departmental_report: 'Report',
  lab_queue: 'Water testing',
}

export function parseStoredHydroNavAccess(raw: unknown): HydroNavAccess | null {
  if (raw == null) return null
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw) as unknown
      return typeof p === 'object' && p !== null && !Array.isArray(p) ? (p as HydroNavAccess) : null
    } catch {
      return null
    }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as HydroNavAccess
  return null
}

export function defaultFullHydroNavAccess(): HydroNavAccess {
  return Object.fromEntries(HYDRO_NAV_ACCESS_KEYS.map((k) => [k, true])) as HydroNavAccess
}

/** Build flags from invite/UI payload: explicit true/false per key. */
export function coerceHydroNavAccess(input: unknown): HydroNavAccess {
  const base = Object.fromEntries(HYDRO_NAV_ACCESS_KEYS.map((k) => [k, false])) as HydroNavAccess
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    const o = input as Record<string, unknown>
    for (const k of HYDRO_NAV_ACCESS_KEYS) {
      if (o[k] === true) base[k] = true
    }
  }
  return base
}

export function hydroNavAccessAllowsAny(flags: HydroNavAccess): boolean {
  return HYDRO_NAV_ACCESS_KEYS.some((k) => flags[k] === true)
}

/** Map current pathname to a hydrological access key (budget/reports before /budget). */
export function hydroPathToAccessKey(pathname: string): HydroNavAccessKey | null {
  const pairs: [string, HydroNavAccessKey][] = [
    ['/hydrological/readings', 'readings'],
    ['/hydrological/monitoring', 'monitoring'],
    ['/hydrological/budget/reports', 'departmental_report'],
    ['/hydrological/budget/requisitions', 'budget'],
    ['/hydrological/budget', 'budget'],
    ['/hydrological/requisitions', 'budget'],
    ['/hydrological/lab-queue', 'lab_queue'],
  ]
  for (const [prefix, key] of pairs) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return key
  }
  return null
}

export function isHydrologicalStaffSubjectToNavAccess(user: User): boolean {
  return user.role === 'staff' && normalizeErpDepartmentKey(user.department) === 'hydrological'
}

/** Whether this user may open a /hydrological/* URL (overview uses any-flag rule). */
export function staffCanAccessHydroPath(user: User, pathname: string): boolean {
  if (!isHydrologicalStaffSubjectToNavAccess(user)) return true
  if (pathname === '/hydrological' || pathname.startsWith('/hydrological?')) {
    return (
      user.hydroNavAccess == null ||
      HYDRO_NAV_ACCESS_KEYS.some((k) => user.hydroNavAccess?.[k] === true)
    )
  }
  const key = hydroPathToAccessKey(pathname)
  if (key == null) return false
  if (user.hydroNavAccess == null) return true
  const legacy = user.hydroNavAccess as Record<string, boolean | undefined>
  if (legacy.requisitions === true && key === 'budget') return true
  return user.hydroNavAccess[key] === true
}

export function canSeeHydrologicalNavChild(user: User, childHref: string): boolean {
  if (!isHydrologicalStaffSubjectToNavAccess(user)) return true
  const key = hydroPathToAccessKey(childHref)
  if (key == null) return false
  if (user.hydroNavAccess == null) return true
  const legacy = user.hydroNavAccess as Record<string, boolean | undefined>
  if (legacy.requisitions === true && key === 'budget') return true
  return user.hydroNavAccess[key] === true
}

export function staffHasAnyHydroNavAccess(user: User): boolean {
  if (!isHydrologicalStaffSubjectToNavAccess(user)) return true
  if (user.hydroNavAccess == null) return true
  const legacy = user.hydroNavAccess as Record<string, boolean | undefined>
  if (legacy.requisitions === true) return true
  return HYDRO_NAV_ACCESS_KEYS.some((k) => user.hydroNavAccess?.[k] === true)
}

/** First allowed path for redirect (stable order). */
export function firstAllowedHydroPath(user: User): string {
  for (const k of HYDRO_NAV_ACCESS_KEYS) {
    if (user.hydroNavAccess == null || user.hydroNavAccess[k] === true) {
      const href: Record<HydroNavAccessKey, string> = {
        readings: '/hydrological/readings',
        monitoring: '/hydrological/monitoring',
        budget: '/hydrological/budget',
        departmental_report: '/hydrological/budget/reports',
        lab_queue: '/hydrological/water-testing',
      }
      return href[k]
    }
  }
  return '/dashboard'
}
