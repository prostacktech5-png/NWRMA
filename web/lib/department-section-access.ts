import {
  departmentOverviewHref,
  getSectionsForDepartment,
  sectionForPathname,
  type DepartmentSection,
} from '@/lib/rbac/department-sections'
import { HYDRO_NAV_ACCESS_KEYS } from '@/lib/hydro-nav-access'
import {
  migrateDepartmentSectionAccess,
  migrateDepartmentSectionFlags,
  normalizeErpDepartmentKey,
} from '@/lib/hydrological-services-merge'
import type {
  Department,
  DepartmentSectionAccess,
  HydroNavAccessKey,
  User,
} from '@/lib/types'

export function parseStoredDepartmentSectionAccess(
  raw: unknown,
): DepartmentSectionAccess | null {
  if (raw == null) return null
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw) as unknown
      return typeof p === 'object' && p !== null && !Array.isArray(p)
        ? migrateDepartmentSectionAccess(p as DepartmentSectionAccess)
        : null
    } catch {
      return null
    }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return migrateDepartmentSectionAccess(raw as DepartmentSectionAccess)
  }
  return null
}

const HYDRO_SECTION_TO_KEY: Record<string, HydroNavAccessKey> = {
  'hydrological:readings': 'readings',
  'hydrological:monitoring': 'monitoring',
  'hydrological:budget': 'budget',
  'hydrological:departmental_report': 'departmental_report',
  'hydrological:lab_queue': 'lab_queue',
}

function userDepartment(user: User): Exclude<Department, null> | null {
  return normalizeErpDepartmentKey(user.department ?? null)
}

/** Merge legacy hydroNavAccess into departmentSectionAccess.hydrological. */
export function resolveDepartmentSectionAccess(user: User): DepartmentSectionAccess | null {
  const raw =
    user.departmentSectionAccess && Object.keys(user.departmentSectionAccess).length > 0
      ? migrateDepartmentSectionAccess(user.departmentSectionAccess)
      : null
  if (raw && Object.keys(raw).length > 0) return raw
  const dept = userDepartment(user)
  if (user.hydroNavAccess && dept === 'hydrological') {
    const flags: Record<string, boolean> = {}
    for (const [sectionId, key] of Object.entries(HYDRO_SECTION_TO_KEY)) {
      if (user.hydroNavAccess[key] === true) flags[sectionId] = true
    }
    const legacy = user.hydroNavAccess as Record<string, boolean | undefined>
    if (legacy.requisitions === true) flags['hydrological:budget'] = true
    return { hydrological: flags }
  }
  return null
}

export function isStaffSubjectToSectionAccess(user: User): boolean {
  return user.role === 'staff' && userDepartment(user) != null
}

function normalizeHydrologicalSectionFlags(
  flags: Record<string, boolean>,
): Record<string, boolean> {
  const migrated = { ...flags }
  for (const [legacyId, newId] of Object.entries({
    'water_quality:lab_queue': 'hydrological:lab_queue',
    'water_quality:budget': 'hydrological:budget',
    'water_quality:documents': 'hydrological:documents',
    'water_quality:reports': 'hydrological:departmental_report',
    'water_quality:requests': 'hydrological:lab_queue',
  })) {
    if (migrated[legacyId] === true) migrated[newId] = true
  }
  if (migrated['hydrological:requisitions'] === true) {
    migrated['hydrological:budget'] = true
  }
  return migrated
}

function flagsForDepartment(
  access: DepartmentSectionAccess | null,
  dept: Exclude<Department, null>,
): Record<string, boolean> | null {
  if (!access) return null
  const raw = access[dept]
  if (!raw || typeof raw !== 'object') return null
  const flags = raw as Record<string, boolean>
  return dept === 'hydrological' ? normalizeHydrologicalSectionFlags(flags) : flags
}

export function staffCanAccessDepartmentPath(user: User, pathname: string): boolean {
  if (!isStaffSubjectToSectionAccess(user)) return true
  const dept = userDepartment(user)
  if (!dept) return true

  const access = resolveDepartmentSectionAccess(user)
  const flags = flagsForDepartment(access, dept)
  if (flags == null) return true

  const overview = departmentOverviewHref(dept)
  if (overview && (pathname === overview || pathname.startsWith(`${overview}?`))) {
    const sections = getSectionsForDepartment(dept)
    return sections.some((s) => flags[s.id] === true)
  }

  const section = sectionForPathname(pathname)
  if (!section || section.department !== dept) {
    return false
  }
  return flags[section.id] === true
}

export function canSeeDepartmentNavChild(user: User, childHref: string): boolean {
  if (!isStaffSubjectToSectionAccess(user)) return true
  return staffCanAccessDepartmentPath(user, childHref)
}

export function staffHasAnyDepartmentSectionAccess(user: User): boolean {
  if (!isStaffSubjectToSectionAccess(user)) return true
  const dept = userDepartment(user)
  if (!dept) return true
  const flags = flagsForDepartment(resolveDepartmentSectionAccess(user), dept)
  if (flags == null) return true
  return getSectionsForDepartment(dept).some((s) => flags[s.id] === true)
}

export function firstAllowedDepartmentPath(user: User): string {
  const dept = userDepartment(user)
  if (!dept) return '/dashboard'
  const flags = flagsForDepartment(resolveDepartmentSectionAccess(user), dept)
  const sections = getSectionsForDepartment(dept)
  for (const s of sections) {
    if (flags == null || flags[s.id] === true) return s.hrefPrefix
  }
  return '/dashboard'
}

export function coerceDepartmentSectionAccess(
  dept: Exclude<Department, null>,
  input: unknown,
): Record<string, boolean> {
  const sections = getSectionsForDepartment(dept)
  const out: Record<string, boolean> = {}
  for (const s of sections) {
    out[s.id] = false
  }
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    const o = migrateDepartmentSectionFlags(input as Record<string, boolean>)
    for (const s of sections) {
      if (o[s.id] === true) out[s.id] = true
    }
  }
  return out
}

export function departmentSectionAccessAllowsAny(
  access: DepartmentSectionAccess | null | undefined,
  dept: Exclude<Department, null>,
): boolean {
  const flags = flagsForDepartment(access ?? null, dept)
  if (flags == null) return true
  return getSectionsForDepartment(dept).some((s) => flags[s.id] === true)
}

/** Build hydroNavAccess from hydrological section flags for backward-compatible writes. */
export function hydroNavAccessFromDepartmentSections(
  hydrologicalFlags: Record<string, boolean> | undefined,
): Record<HydroNavAccessKey, boolean> | null {
  if (!hydrologicalFlags) return null
  const normalized = normalizeHydrologicalSectionFlags(hydrologicalFlags)
  const out = Object.fromEntries(HYDRO_NAV_ACCESS_KEYS.map((k) => [k, false])) as Record<
    HydroNavAccessKey,
    boolean
  >
  let any = false
  for (const [sectionId, key] of Object.entries(HYDRO_SECTION_TO_KEY)) {
    if (normalized[sectionId] === true) {
      out[key] = true
      any = true
    }
  }
  return any ? out : null
}

export function listEnabledSections(
  access: DepartmentSectionAccess | null,
  dept: Exclude<Department, null>,
): DepartmentSection[] {
  const flags = flagsForDepartment(access, dept)
  const sections = getSectionsForDepartment(dept)
  if (flags == null) return sections
  return sections.filter((s) => flags[s.id] === true)
}
