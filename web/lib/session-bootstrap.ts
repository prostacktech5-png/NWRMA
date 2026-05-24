import {
  readActingUserIdFromRequest,
  readSessionCookieFromRequest,
} from '@/lib/demo-acting-user'
import { getSql, isPostgresUndefinedColumnError, isPostgresUndefinedRelationError } from '@/lib/db'
import { loadUserPlatformRoles } from '@/lib/db/rbac-persistence'
import { getRecordById } from '@/lib/local-password-store'
import { parseStoredDepartmentSectionAccess } from '@/lib/department-section-access'
import { normalizeErpDepartmentKey } from '@/lib/hydrological-services-merge'
import { parseStoredHydroNavAccess } from '@/lib/hydro-nav-access'
import { hashSessionToken, verifySignedSession } from '@/lib/super-admin/session'
import type { Department, HydroNavAccess, Role, User } from '@/lib/types'

const DEPTS = new Set<string>([
  'hydrological',
  'boreholes',
  'financial',
  'hr',
  'compliance',
])

export type SessionBootstrapResult = {
  user: User | null
  platformRoles: string[]
  canAccessSuperAdmin: boolean
}

function isRole(r: string): r is Role {
  return r === 'admin' || r === 'dg' || r === 'hod' || r === 'staff'
}

function normalizeDepartment(role: Role, raw: string | null): Department {
  if (role !== 'hod' && role !== 'staff') return null
  const key = normalizeErpDepartmentKey(raw)
  if (!key || !DEPTS.has(key)) return null
  return key
}

function userFromRow(row: Record<string, unknown>): User | null {
  const roleNorm = String(row.role ?? '').trim().toLowerCase()
  if (!isRole(roleNorm)) return null

  const statusRaw = row.status != null ? String(row.status) : 'active'
  if (statusRaw === 'disabled') return null
  if (row.deleted_at != null) return null
  const lockedUntil = row.locked_until ? new Date(String(row.locked_until)) : null
  if (lockedUntil && lockedUntil > new Date()) return null

  const department =
    roleNorm === 'dg' ? null : normalizeDepartment(roleNorm, row.department != null ? String(row.department) : null)
  if ((roleNorm === 'hod' || roleNorm === 'staff') && !department) return null

  const hydroNavAccess: HydroNavAccess | null | undefined =
    'hydroNavAccess' in row || 'hydro_nav_access' in row
      ? parseStoredHydroNavAccess(row.hydroNavAccess ?? row.hydro_nav_access)
      : undefined

  const departmentSectionAccess =
    'departmentSectionAccess' in row || 'department_section_access' in row
      ? parseStoredDepartmentSectionAccess(
          row.departmentSectionAccess ?? row.department_section_access,
        )
      : undefined

  const updatedAt = new Date(String(row.updatedAt ?? row.updated_at ?? Date.now()))
  if (Number.isNaN(updatedAt.getTime())) return null

  return {
    id: String(row.id),
    email: String(row.email ?? '').trim().toLowerCase(),
    name: String(row.fullName ?? row.full_name ?? ''),
    role: roleNorm,
    department,
    status: statusRaw === 'disabled' ? 'disabled' : 'active',
    createdAt: updatedAt,
    ...(hydroNavAccess !== undefined ? { hydroNavAccess } : {}),
    ...(departmentSectionAccess !== undefined ? { departmentSectionAccess } : {}),
  }
}

function userFromStoreRecord(rec: {
  id: string
  email: string
  fullName: string
  role: string
  department: string | null
  hydroNavAccess: HydroNavAccess | null
  updatedAt: string
}): User | null {
  const roleNorm = rec.role.trim().toLowerCase()
  if (!isRole(roleNorm)) return null
  const department =
    roleNorm === 'dg' ? null : normalizeDepartment(roleNorm, rec.department)
  if ((roleNorm === 'hod' || roleNorm === 'staff') && !department) return null
  return {
    id: rec.id,
    email: rec.email,
    name: rec.fullName,
    role: roleNorm,
    department,
    status: 'active',
    createdAt: new Date(rec.updatedAt),
    hydroNavAccess: rec.hydroNavAccess,
  }
}

async function resolveUserFromSignedSession(signedValue: string): Promise<User | null> {
  const parsed = verifySignedSession(signedValue)
  if (!parsed) return null
  if (!process.env.DATABASE_URL?.trim()) return null

  try {
    const sql = getSql()
    const tokenHash = hashSessionToken(parsed.token)
    let rows: Record<string, unknown>[]
    try {
      rows = (await sql`
        SELECT
          u.id,
          u.email,
          u."fullName" AS "fullName",
          u.role,
          u.department,
          u."hydroNavAccess" AS "hydroNavAccess",
          u."departmentSectionAccess" AS "departmentSectionAccess",
          u."updatedAt" AS "updatedAt",
          u.status,
          u.deleted_at,
          u.locked_until
        FROM user_sessions s
        INNER JOIN "User" u ON u.id = s.user_id
        WHERE s.id = ${parsed.sessionId}
          AND s.token_hash = ${tokenHash}
          AND s.revoked_at IS NULL
          AND s.expires_at > now()
          AND u.deleted_at IS NULL
      `) as Record<string, unknown>[]
    } catch (e) {
      if (!isPostgresUndefinedColumnError(e)) throw e
      rows = (await sql`
        SELECT
          u.id,
          u.email,
          u."fullName" AS "fullName",
          u.role,
          u.department,
          u."updatedAt" AS "updatedAt"
        FROM user_sessions s
        INNER JOIN "User" u ON u.id = s.user_id
        WHERE s.id = ${parsed.sessionId}
          AND s.token_hash = ${tokenHash}
          AND s.revoked_at IS NULL
          AND s.expires_at > now()
      `) as Record<string, unknown>[]
    }
    const row = rows[0]
    return row ? userFromRow(row) : null
  } catch (e) {
    if (isPostgresUndefinedRelationError(e)) return null
    throw e
  }
}

async function resolveUserByLegacyId(userId: string): Promise<User | null> {
  const rec = await getRecordById(userId)
  if (!rec) return null

  try {
    const sql = getSql()
    const rows = await sql`
      SELECT status, deleted_at, locked_until FROM "User" WHERE id = ${userId.trim()}
    `
    const row = rows[0] as Record<string, unknown> | undefined
    if (!row) return null
    if (row.deleted_at != null) return null
    if (String(row.status ?? 'active') === 'disabled') return null
    const lockedUntil = row.locked_until ? new Date(String(row.locked_until)) : null
    if (lockedUntil && lockedUntil > new Date()) return null
  } catch (e) {
    if (!isPostgresUndefinedColumnError(e)) throw e
  }

  return userFromStoreRecord(rec)
}

/** Lightweight super-admin gate without full permission expansion. */
export async function computeCanAccessSuperAdmin(
  userId: string,
  platformRoles: string[],
): Promise<boolean> {
  if (platformRoles.includes('super_admin')) return true
  if (!process.env.DATABASE_URL?.trim()) return false

  try {
    const sql = getSql()
    const rows = await sql`
      SELECT 1
      FROM user_platform_roles upr
      JOIN platform_role_permissions rp ON rp.role_id = upr.role_id
      JOIN platform_permissions p ON p.id = rp.permission_id
      WHERE upr.user_id = ${userId}
        AND (
          (p.resource = 'system' AND p.action = 'read')
          OR (p.resource = 'audit' AND p.action = 'read')
        )
      LIMIT 1
    `
    return rows.length > 0
  } catch (e) {
    if (isPostgresUndefinedRelationError(e)) return false
    throw e
  }
}

export async function sessionMetaForUser(user: User): Promise<{
  platformRoles: string[]
  canAccessSuperAdmin: boolean
}> {
  const platformRoles = await loadUserPlatformRoles(user.id)
  const canAccessSuperAdmin = await computeCanAccessSuperAdmin(user.id, platformRoles)
  return { platformRoles, canAccessSuperAdmin }
}

/** Fast session bootstrap: ~2–3 DB queries instead of full RBAC viewer resolution. */
export async function resolveSessionBootstrap(req: Request): Promise<SessionBootstrapResult> {
  const empty: SessionBootstrapResult = {
    user: null,
    platformRoles: [],
    canAccessSuperAdmin: false,
  }

  if (!process.env.DATABASE_URL?.trim()) return empty

  let user: User | null = null
  const signed = readSessionCookieFromRequest(req)
  if (signed) {
    user = await resolveUserFromSignedSession(signed)
  }

  if (!user) {
    const legacyId = readActingUserIdFromRequest(req)
    if (legacyId) {
      user = await resolveUserByLegacyId(legacyId)
    }
  }

  if (!user) return empty

  const { platformRoles, canAccessSuperAdmin } = await sessionMetaForUser(user)
  return { user, platformRoles, canAccessSuperAdmin }
}

export function jsonSessionUser(u: User) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    department: u.department,
    status: u.status,
    createdAt: u.createdAt.toISOString(),
    hydroNavAccess: u.hydroNavAccess ?? null,
    departmentSectionAccess: u.departmentSectionAccess ?? null,
  }
}
