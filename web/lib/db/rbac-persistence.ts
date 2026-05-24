import { getSql, isPostgresUndefinedColumnError, isPostgresUndefinedRelationError } from '@/lib/db'
import type {
  GeoScope,
  PlatformPermission,
  PlatformRoleRecord,
} from '@/lib/rbac/permissions'
import { permissionKey, type PlatformAction, type PlatformResource } from '@/lib/rbac/permissions'

export async function loadUserPlatformRoles(userId: string): Promise<string[]> {
  const map = await loadPlatformRolesForUserIds([userId])
  return map.get(userId) ?? []
}

/** Single query for many users (avoids N+1 on directory list). */
export async function loadPlatformRolesForUserIds(
  userIds: string[],
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>()
  if (!userIds.length) return result
  try {
    const sql = getSql()
    const rows = await sql`
      SELECT upr.user_id, pr.code
      FROM user_platform_roles upr
      JOIN platform_roles pr ON pr.id = upr.role_id
      WHERE upr.user_id IN ${sql(userIds)}
    `
    for (const r of rows) {
      const row = r as { user_id: string; code: string }
      const uid = String(row.user_id)
      const list = result.get(uid) ?? []
      list.push(String(row.code))
      result.set(uid, list)
    }
  } catch (e) {
    if (isPostgresUndefinedRelationError(e)) return result
    throw e
  }
  return result
}

export async function loadUserPermissions(userId: string): Promise<Set<PlatformPermission>> {
  try {
    const sql = getSql()
    const rows = await sql`
      SELECT DISTINCT p.resource, p.action
      FROM user_platform_roles upr
      JOIN platform_role_permissions rp ON rp.role_id = upr.role_id
      JOIN platform_permissions p ON p.id = rp.permission_id
      WHERE upr.user_id = ${userId}
    `
    const set = new Set<PlatformPermission>()
    for (const r of rows) {
      const row = r as { resource: string; action: string }
      set.add(permissionKey(row.resource as PlatformResource, row.action as PlatformAction))
    }
    return set
  } catch (e) {
    if (isPostgresUndefinedRelationError(e)) return new Set()
    throw e
  }
}

export async function loadUserGeoScopes(userId: string): Promise<GeoScope[]> {
  try {
    const sql = getSql()
    const rows = await sql`
      SELECT id, region_id, district_id, chiefdom_id
      FROM user_geo_scopes
      WHERE user_id = ${userId}
    `
    return rows.map((r) => {
      const row = r as Record<string, unknown>
      return {
        id: String(row.id),
        regionId: row.region_id != null ? String(row.region_id) : null,
        districtId: row.district_id != null ? String(row.district_id) : null,
        chiefdomId: row.chiefdom_id != null ? String(row.chiefdom_id) : null,
      }
    })
  } catch (e) {
    if (isPostgresUndefinedRelationError(e)) return []
    throw e
  }
}

export async function loadUserSecurityFields(userId: string): Promise<{
  status: string
  deletedAt: Date | null
  lockedUntil: Date | null
}> {
  try {
    const sql = getSql()
    const rows = await sql`
      SELECT status, deleted_at, locked_until FROM "User" WHERE id = ${userId}
    `
    const row = rows[0] as Record<string, unknown> | undefined
    if (!row) return { status: 'active', deletedAt: null, lockedUntil: null }
    return {
      status: String(row.status ?? 'active'),
      deletedAt: row.deleted_at ? new Date(String(row.deleted_at)) : null,
      lockedUntil: row.locked_until ? new Date(String(row.locked_until)) : null,
    }
  } catch (e) {
    if (isPostgresUndefinedColumnError(e)) {
      return { status: 'active', deletedAt: null, lockedUntil: null }
    }
    throw e
  }
}

export async function listPlatformRoles(): Promise<PlatformRoleRecord[]> {
  const sql = getSql()
  const rows = await sql`
    SELECT id, code, name, description, is_system
    FROM platform_roles
    ORDER BY is_system DESC, name ASC
  `
  return rows.map((r) => {
    const row = r as Record<string, unknown>
    return {
      id: String(row.id),
      code: String(row.code),
      name: String(row.name),
      description: row.description != null ? String(row.description) : null,
      isSystem: Boolean(row.is_system),
    }
  })
}

export async function listAllPermissions(): Promise<
  { id: string; resource: string; action: string }[]
> {
  const sql = getSql()
  const rows = await sql`SELECT id, resource, action FROM platform_permissions ORDER BY resource, action`
  return rows.map((r) => {
    const row = r as Record<string, unknown>
    return {
      id: String(row.id),
      resource: String(row.resource),
      action: String(row.action),
    }
  })
}

export async function getRolePermissionIds(roleId: string): Promise<string[]> {
  const sql = getSql()
  const rows = await sql`
    SELECT permission_id FROM platform_role_permissions WHERE role_id = ${roleId}
  `
  return rows.map((r) => String((r as { permission_id: string }).permission_id))
}

/** All role→permission links in one query (avoids N+1 on roles list). */
export async function getAllRolePermissionIds(): Promise<Record<string, string[]>> {
  const matrix: Record<string, string[]> = {}
  try {
    const sql = getSql()
    const rows = await sql`
      SELECT role_id, permission_id FROM platform_role_permissions
    `
    for (const r of rows) {
      const row = r as { role_id: string; permission_id: string }
      const roleId = String(row.role_id)
      const list = matrix[roleId] ?? []
      list.push(String(row.permission_id))
      matrix[roleId] = list
    }
  } catch (e) {
    if (isPostgresUndefinedRelationError(e)) return matrix
    throw e
  }
  return matrix
}

/** User count per platform role (one GROUP BY). */
export async function countUsersPerRole(): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  try {
    const sql = getSql()
    const rows = await sql`
      SELECT role_id, COUNT(DISTINCT user_id)::int AS c
      FROM user_platform_roles
      GROUP BY role_id
    `
    for (const r of rows) {
      const row = r as { role_id: string; c: number }
      counts.set(String(row.role_id), Number(row.c ?? 0))
    }
  } catch (e) {
    if (isPostgresUndefinedRelationError(e)) return counts
    throw e
  }
  return counts
}

/** Distinct users with at least one platform role. */
export async function countAssignedPlatformUsers(): Promise<number> {
  try {
    const sql = getSql()
    const rows = await sql`
      SELECT COUNT(DISTINCT user_id)::int AS c FROM user_platform_roles
    `
    return Number((rows[0] as { c: number })?.c ?? 0)
  } catch (e) {
    if (isPostgresUndefinedRelationError(e)) return 0
    throw e
  }
}

export async function setRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
  const sql = getSql()
  await sql`DELETE FROM platform_role_permissions WHERE role_id = ${roleId}`
  for (const pid of permissionIds) {
    await sql`
      INSERT INTO platform_role_permissions (role_id, permission_id)
      VALUES (${roleId}, ${pid})
      ON CONFLICT DO NOTHING
    `
  }
}

export async function assignUserRoles(
  userId: string,
  roleIds: string[],
  primaryRoleId?: string
): Promise<void> {
  const sql = getSql()
  await sql`DELETE FROM user_platform_roles WHERE user_id = ${userId}`
  for (const roleId of roleIds) {
    await sql`
      INSERT INTO user_platform_roles (user_id, role_id, is_primary)
      VALUES (${userId}, ${roleId}, ${roleId === primaryRoleId})
    `
  }
}

export async function assignUserGeoScopes(
  userId: string,
  scopes: { regionId?: string | null; districtId?: string | null; chiefdomId?: string | null }[]
): Promise<void> {
  const sql = getSql()
  await sql`DELETE FROM user_geo_scopes WHERE user_id = ${userId}`
  const { randomUUID } = await import('crypto')
  for (const s of scopes) {
    await sql`
      INSERT INTO user_geo_scopes (id, user_id, region_id, district_id, chiefdom_id)
      VALUES (${randomUUID()}, ${userId}, ${s.regionId ?? null}, ${s.districtId ?? null}, ${s.chiefdomId ?? null})
    `
  }
}

export async function userHasSuperAdminRole(userId: string): Promise<boolean> {
  const roles = await loadUserPlatformRoles(userId)
  return roles.includes('super_admin')
}
