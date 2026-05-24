import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import { getSql, isPostgresUndefinedColumnError } from '@/lib/db'
import {
  assignUserRoles,
  loadPlatformRolesForUserIds,
  loadUserPlatformRoles,
} from '@/lib/db/rbac-persistence'
import {
  coerceDepartmentSectionAccess,
  hydroNavAccessFromDepartmentSections,
  parseStoredDepartmentSectionAccess,
} from '@/lib/department-section-access'
import { minTemporaryAccountExpiresAt, parseAccountExpiresAt } from '@/lib/account-expiry'
import { isValidJobTitle, JOB_TITLES } from '@/lib/job-titles'
import { isValidErpDepartment, type ErpRoleValue } from '@/lib/org-departments'
import { parseStoredHydroNavAccess } from '@/lib/hydro-nav-access'
import type { Department, DepartmentSectionAccess, HydroNavAccess } from '@/lib/types'
import { inviteExpiryMs } from '@/lib/invite-token'
import { upsertPendingInviteUser } from '@/lib/user-invite-persistence'

export type AdminUserRow = {
  id: string
  email: string
  name: string
  jobTitle: string | null
  role: string
  department: string | null
  status: string
  mustChangePassword: boolean
  createdAt: string
  platformRoles: string[]
  departmentSectionAccess?: DepartmentSectionAccess | null
  hydroNavAccess?: HydroNavAccess | null
  accountExpiresAt?: string | null
}

const VALID_ERP_ROLES: ErpRoleValue[] = ['admin', 'dg', 'hod', 'staff']

export function isValidErpRole(role: string): role is ErpRoleValue {
  return VALID_ERP_ROLES.includes(role as ErpRoleValue)
}

export function normalizeCreateUserInput(input: {
  email: string
  fullName: string
  role: string
  department: string | null | undefined
  jobTitle?: string | null
  roleIds?: string[]
}):
  | {
      ok: true
      data: {
        email: string
        fullName: string
        role: string
        department: string | null
        jobTitle: string | null
        roleIds?: string[]
      }
    }
  | { ok: false; error: string } {
  const email = input.email.trim().toLowerCase()
  const fullName = input.fullName.trim()
  const role = input.role.trim()
  const jobTitle = input.jobTitle?.trim() ? input.jobTitle.trim() : null

  if (!email || !email.includes('@')) {
    return { ok: false, error: 'A valid email address is required.' }
  }
  if (!fullName) {
    return { ok: false, error: 'Full name is required.' }
  }
  if (!isValidErpRole(role)) {
    return { ok: false, error: 'Invalid ERP role.' }
  }

  let department: string | null =
    input.department === null || input.department === undefined || input.department === ''
      ? null
      : String(input.department)

  if (role === 'admin' || role === 'dg') {
    department = null
  } else if (role === 'hod' || role === 'staff') {
    if (!isValidErpDepartment(department)) {
      return { ok: false, error: 'Department is required for Head of Department and Staff.' }
    }
  }

  if (!input.roleIds?.length) {
    return { ok: false, error: 'A platform permission role is required.' }
  }

  return {
    ok: true,
    data: {
      email,
      fullName,
      role,
      department,
      jobTitle,
      roleIds: input.roleIds,
    },
  }
}

function mapUserRow(r: Record<string, unknown>, roles: string[]): AdminUserRow {
  const departmentSectionAccess = parseStoredDepartmentSectionAccess(
    r.departmentSectionAccess ?? r.department_section_access,
  )
  return {
    id: String(r.id),
    email: String(r.email ?? ''),
    name: String(r.fullName ?? r.full_name ?? ''),
    jobTitle:
      r.job_title != null
        ? String(r.job_title)
        : r.jobTitle != null
          ? String(r.jobTitle)
          : null,
    role: String(r.role ?? 'staff')
      .trim()
      .toLowerCase(),
    department:
      r.department != null
        ? String(r.department).trim().toLowerCase()
        : null,
    status: String(r.status ?? 'active'),
    mustChangePassword: Boolean(r.must_change_password ?? r.mustChangePassword ?? false),
    createdAt: new Date(String(r.createdAt ?? r.created_at ?? Date.now())).toISOString(),
    platformRoles: roles,
    departmentSectionAccess,
    hydroNavAccess: parseStoredHydroNavAccess(r.hydroNavAccess ?? r.hydro_nav_access),
    accountExpiresAt: (() => {
      const d = parseAccountExpiresAt(r.account_expires_at ?? r.accountExpiresAt)
      return d ? d.toISOString() : null
    })(),
  }
}

export function normalizeTemporaryUserInput(input: {
  email: string
  fullName: string
  department: string | null | undefined
  accountExpiresAt: unknown
}):
  | {
      ok: true
      data: {
        email: string
        fullName: string
        department: string
        accountExpiresAt: Date
        role: 'staff'
        jobTitle: string
      }
    }
  | { ok: false; error: string } {
  const email = input.email.trim().toLowerCase()
  const fullName = input.fullName.trim()
  const departmentRaw =
    input.department === null || input.department === undefined || input.department === ''
      ? null
      : String(input.department).trim().toLowerCase()

  if (!email || !email.includes('@')) {
    return { ok: false, error: 'A valid email address is required.' }
  }
  if (!fullName) {
    return { ok: false, error: 'Full name is required.' }
  }
  if (!isValidErpDepartment(departmentRaw)) {
    return { ok: false, error: 'A valid department is required.' }
  }

  const accountExpiresAt = parseAccountExpiresAt(input.accountExpiresAt)
  if (!accountExpiresAt) {
    return { ok: false, error: 'Access end date and time is required.' }
  }
  if (accountExpiresAt.getTime() < minTemporaryAccountExpiresAt().getTime()) {
    return {
      ok: false,
      error: 'Access end time must be at least one hour in the future.',
    }
  }

  const jobTitle = JOB_TITLES[0]?.value ?? 'Field Officer'

  return {
    ok: true,
    data: {
      email,
      fullName,
      department: departmentRaw,
      accountExpiresAt,
      role: 'staff',
      jobTitle,
    },
  }
}

export async function setUserAccountExpiresAt(
  userId: string,
  expiresAt: Date,
): Promise<void> {
  const sql = getSql()
  try {
    await sql`
      UPDATE "User"
      SET account_expires_at = ${expiresAt.toISOString()}::timestamptz,
          "updatedAt" = now()
      WHERE id = ${userId}
    `
  } catch (e) {
    if (!isPostgresUndefinedColumnError(e)) throw e
  }
}

export async function createTemporaryUserInvited(input: {
  email: string
  fullName: string
  department: string
  accountExpiresAt: Date
  roleIds?: string[]
}): Promise<AdminUserRow> {
  const jobTitle = JOB_TITLES[0]?.value ?? 'Field Officer'
  const user = await createAdminUserInvited({
    email: input.email,
    fullName: input.fullName,
    role: 'staff',
    department: input.department,
    jobTitle,
    roleIds: input.roleIds,
  })
  await setUserAccountExpiresAt(user.id, input.accountExpiresAt)
  return loadAdminUserById(user.id)
}

type UserListColProfile = 0 | 1 | 2 | 3
type UserListWhereMode = 'rbac' | 'legacy'

function activeStatusSql(
  sql: ReturnType<typeof getSql>,
  status: string,
) {
  if (status === 'active') {
    return sql`(status = ${status} OR status IS NULL)`
  }
  return sql`status = ${status}`
}

async function fetchUserRows(
  sql: ReturnType<typeof getSql>,
  limit: number,
  offset: number,
  variant: 'full' | 'search' | 'status' | 'search_status',
  pattern?: string,
  status?: string,
  profile: UserListColProfile = 0,
  whereMode: UserListWhereMode = 'rbac',
): Promise<Record<string, unknown>[]> {
  if (whereMode === 'legacy' && (variant === 'status' || variant === 'search_status')) {
    const legacyVariant =
      variant === 'search_status' && pattern ? 'search' : 'full'
    return fetchUserRows(
      sql,
      limit,
      offset,
      legacyVariant,
      pattern,
      undefined,
      profile,
      'legacy',
    )
  }

  const cols =
    profile === 0
      ? sql`id, email, "fullName", job_title, role, department, status, must_change_password, "createdAt", "departmentSectionAccess", "hydroNavAccess"`
      : profile === 1
        ? sql`id, email, "fullName", role, department, status, must_change_password, "createdAt", "departmentSectionAccess", "hydroNavAccess"`
        : profile === 2
          ? sql`id, email, "fullName", role, department, status, must_change_password, "createdAt", "hydroNavAccess"`
          : sql`id, email, "fullName", role, department, status, must_change_password, "createdAt"`

  const searchUsesJobTitle = profile === 0
  const notDeleted =
    whereMode === 'rbac' ? sql`deleted_at IS NULL` : sql`true`
  const statusClause =
    whereMode === 'rbac' && status ? activeStatusSql(sql, status) : null

  if (variant === 'full') {
    return (await sql`
      SELECT ${cols}
      FROM "User"
      WHERE ${notDeleted}
      ORDER BY "createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `) as Record<string, unknown>[]
  }
  if (variant === 'status' && status && whereMode === 'rbac') {
    return (await sql`
      SELECT ${cols}
      FROM "User"
      WHERE ${notDeleted} AND ${statusClause}
      ORDER BY "createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `) as Record<string, unknown>[]
  }
  if (variant === 'search' && pattern) {
    if (searchUsesJobTitle) {
      return (await sql`
        SELECT ${cols}
        FROM "User"
        WHERE ${notDeleted}
          AND (
            lower(email) LIKE ${pattern}
            OR lower("fullName") LIKE ${pattern}
            OR lower(COALESCE(job_title, '')) LIKE ${pattern}
          )
        ORDER BY "createdAt" DESC
        LIMIT ${limit} OFFSET ${offset}
      `) as Record<string, unknown>[]
    }
    return (await sql`
      SELECT ${cols}
      FROM "User"
      WHERE ${notDeleted}
        AND (lower(email) LIKE ${pattern} OR lower("fullName") LIKE ${pattern})
      ORDER BY "createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `) as Record<string, unknown>[]
  }
  if (variant === 'search_status' && pattern && status && whereMode === 'rbac') {
    if (searchUsesJobTitle) {
      return (await sql`
        SELECT ${cols}
        FROM "User"
        WHERE ${notDeleted} AND ${statusClause}
          AND (
            lower(email) LIKE ${pattern}
            OR lower("fullName") LIKE ${pattern}
            OR lower(COALESCE(job_title, '')) LIKE ${pattern}
          )
        ORDER BY "createdAt" DESC
        LIMIT ${limit} OFFSET ${offset}
      `) as Record<string, unknown>[]
    }
    return (await sql`
      SELECT ${cols}
      FROM "User"
      WHERE ${notDeleted} AND ${statusClause}
        AND (lower(email) LIKE ${pattern} OR lower("fullName") LIKE ${pattern})
      ORDER BY "createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `) as Record<string, unknown>[]
  }
  return []
}

async function fetchUserRowsResilient(
  sql: ReturnType<typeof getSql>,
  limit: number,
  offset: number,
  variant: 'full' | 'search' | 'status' | 'search_status',
  pattern?: string,
  status?: string,
): Promise<Record<string, unknown>[]> {
  const profiles: UserListColProfile[] = [0, 1, 2, 3]
  for (const whereMode of ['rbac', 'legacy'] as const) {
    for (const profile of profiles) {
      try {
        return await fetchUserRows(
          sql,
          limit,
          offset,
          variant,
          pattern,
          status,
          profile,
          whereMode,
        )
      } catch (e) {
        if (!isPostgresUndefinedColumnError(e)) throw e
      }
    }
  }
  return []
}

export async function listAdminUsers(opts?: {
  search?: string
  status?: string
  limit?: number
  offset?: number
  /** When false, skips platform role joins (faster user directory). Default false. */
  includePlatformRoles?: boolean
}): Promise<{ items: AdminUserRow[]; total: number }> {
  const sql = getSql()
  const limit = opts?.limit ?? 100
  const offset = opts?.offset ?? 0
  const search = opts?.search?.trim().toLowerCase()
  const status = opts?.status?.trim()
  const pattern = search ? `%${search}%` : undefined

  let variant: 'full' | 'search' | 'status' | 'search_status' = 'full'
  if (pattern && status) variant = 'search_status'
  else if (pattern) variant = 'search'
  else if (status) variant = 'status'

  let total = 0
  try {
    if (variant === 'search_status' && pattern && status) {
      const countRows = await sql`
        SELECT COUNT(*)::int AS c FROM "User"
        WHERE deleted_at IS NULL AND ${activeStatusSql(sql, status)}
          AND (
            lower(email) LIKE ${pattern}
            OR lower("fullName") LIKE ${pattern}
            OR lower(COALESCE(job_title, '')) LIKE ${pattern}
          )
      `
      total = Number((countRows[0] as { c: number })?.c ?? 0)
    } else if (variant === 'search' && pattern) {
      const countRows = await sql`
        SELECT COUNT(*)::int AS c FROM "User"
        WHERE deleted_at IS NULL
          AND (
            lower(email) LIKE ${pattern}
            OR lower("fullName") LIKE ${pattern}
            OR lower(COALESCE(job_title, '')) LIKE ${pattern}
          )
      `
      total = Number((countRows[0] as { c: number })?.c ?? 0)
    } else if (variant === 'status' && status) {
      const countRows = await sql`
        SELECT COUNT(*)::int AS c FROM "User"
        WHERE deleted_at IS NULL AND ${activeStatusSql(sql, status)}
      `
      total = Number((countRows[0] as { c: number })?.c ?? 0)
    } else {
      const countRows = await sql`
        SELECT COUNT(*)::int AS c FROM "User" WHERE deleted_at IS NULL
      `
      total = Number((countRows[0] as { c: number })?.c ?? 0)
    }
  } catch (e) {
    if (!isPostgresUndefinedColumnError(e) || !pattern) throw e
    if (variant === 'search_status' && status) {
      const countRows = await sql`
        SELECT COUNT(*)::int AS c FROM "User"
        WHERE deleted_at IS NULL AND ${activeStatusSql(sql, status)}
          AND (lower(email) LIKE ${pattern} OR lower("fullName") LIKE ${pattern})
      `
      total = Number((countRows[0] as { c: number })?.c ?? 0)
    } else {
      const countRows = await sql`
        SELECT COUNT(*)::int AS c FROM "User"
        WHERE deleted_at IS NULL
          AND (lower(email) LIKE ${pattern} OR lower("fullName") LIKE ${pattern})
      `
      total = Number((countRows[0] as { c: number })?.c ?? 0)
    }
  }

  const rows = await fetchUserRowsResilient(sql, limit, offset, variant, pattern, status)
  const includePlatformRoles = opts?.includePlatformRoles === true
  const userIds = rows.map((r) => String(r.id))
  const rolesByUser = includePlatformRoles
    ? await loadPlatformRolesForUserIds(userIds)
    : new Map<string, string[]>()

  const items: AdminUserRow[] = []
  for (const r of rows) {
    const id = String(r.id)
    const platformRoles = includePlatformRoles ? (rolesByUser.get(id) ?? []) : []
    items.push(mapUserRow(r, platformRoles))
  }
  return { items, total }
}

/** Create user with pending invite; caller sends set-password email. */
export async function createAdminUserInvited(input: {
  email: string
  fullName: string
  role: string
  department: string | null
  jobTitle?: string | null
  roleIds?: string[]
}): Promise<AdminUserRow> {
  const inviteExpiresAt = new Date(Date.now() + inviteExpiryMs())
  await upsertPendingInviteUser({
    email: input.email,
    fullName: input.fullName.trim(),
    role: input.role,
    department: input.department,
    inviteExpiresAt,
  })

  const userId = await findUserIdByEmail(input.email)
  if (!userId) {
    throw new Error('Failed to create invited user record.')
  }

  const jobTitle = input.jobTitle?.trim() ? input.jobTitle.trim() : null
  if (jobTitle) {
    const sql = getSql()
    try {
      await sql`
        UPDATE "User" SET job_title = ${jobTitle}, "updatedAt" = now() WHERE id = ${userId}
      `
    } catch (e) {
      if (!isPostgresUndefinedColumnError(e)) throw e
    }
  }

  const sql = getSql()
  try {
    await sql`
      UPDATE "User" SET status = 'active', "updatedAt" = now() WHERE id = ${userId}
    `
  } catch (e) {
    if (!isPostgresUndefinedColumnError(e)) throw e
  }

  if (input.roleIds?.length) {
    await assignUserRoles(userId, input.roleIds, input.roleIds[0])
  }

  return loadAdminUserById(userId)
}

async function loadAdminUserById(userId: string): Promise<AdminUserRow> {
  const sql = getSql()
  let rows: Record<string, unknown>[]
  try {
    rows = (await sql`
      SELECT id, email, "fullName", job_title, role, department, status,
        must_change_password, "createdAt", account_expires_at
      FROM "User" WHERE id = ${userId}
    `) as Record<string, unknown>[]
  } catch (e) {
    if (!isPostgresUndefinedColumnError(e)) throw e
    try {
      rows = (await sql`
        SELECT id, email, "fullName", job_title, role, department, status,
          must_change_password, "createdAt"
        FROM "User" WHERE id = ${userId}
      `) as Record<string, unknown>[]
    } catch (e2) {
      if (!isPostgresUndefinedColumnError(e2)) throw e2
      rows = (await sql`
        SELECT id, email, "fullName", role, department, status,
          must_change_password, "createdAt"
        FROM "User" WHERE id = ${userId}
      `) as Record<string, unknown>[]
    }
  }
  const platformRoles = await loadUserPlatformRoles(userId)
  return mapUserRow(rows[0] as Record<string, unknown>, platformRoles)
}

export async function createAdminUser(input: {
  email: string
  fullName: string
  role: string
  department: string | null
  jobTitle?: string | null
  password: string
  roleIds?: string[]
}): Promise<AdminUserRow> {
  const sql = getSql()
  const id = randomUUID()
  const email = input.email.trim().toLowerCase()
  const passwordHash = await bcrypt.hash(input.password, 10)
  const jobTitle = input.jobTitle?.trim() ? input.jobTitle.trim() : null

  try {
    await sql`
      INSERT INTO "User" (
        id, email, phone, "passwordHash", "fullName", job_title, role, department,
        status, must_change_password, "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${email}, null, ${passwordHash}, ${input.fullName.trim()}, ${jobTitle},
        ${input.role}, ${input.department}, 'active', true, now(), now()
      )
    `
  } catch (e) {
    if (!isPostgresUndefinedColumnError(e)) throw e
    await sql`
      INSERT INTO "User" (
        id, email, phone, "passwordHash", "fullName", role, department,
        status, must_change_password, "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${email}, null, ${passwordHash}, ${input.fullName.trim()},
        ${input.role}, ${input.department}, 'active', true, now(), now()
      )
    `
  }

  if (input.roleIds?.length) {
    await assignUserRoles(id, input.roleIds, input.roleIds[0])
  }

  const platformRoles = await loadUserPlatformRoles(id)
  return mapUserRow(
    {
      id,
      email,
      full_name: input.fullName,
      job_title: jobTitle,
      role: input.role,
      department: input.department,
      status: 'active',
      must_change_password: true,
      created_at: new Date().toISOString(),
    },
    platformRoles,
  )
}

export async function updateAdminUser(
  id: string,
  patch: {
    fullName?: string
    jobTitle?: string | null
    role?: string
    department?: string | null
    status?: string
    mustChangePassword?: boolean
    departmentSectionAccess?: DepartmentSectionAccess | null
  },
): Promise<AdminUserRow | null> {
  const sql = getSql()
  const existing = await sql`SELECT id FROM "User" WHERE id = ${id} AND deleted_at IS NULL`
  if (!existing.length) return null

  if (patch.departmentSectionAccess !== undefined) {
    const json =
      patch.departmentSectionAccess != null
        ? JSON.stringify(patch.departmentSectionAccess)
        : null
    const hydro = hydroNavAccessFromDepartmentSections(
      patch.departmentSectionAccess?.hydrological as Record<string, boolean> | undefined,
    )
    const hydroJson = hydro != null ? JSON.stringify(hydro) : null
    try {
      await sql`
        UPDATE "User" SET
          "departmentSectionAccess" = ${json},
          "hydroNavAccess" = ${hydroJson},
          "updatedAt" = now()
        WHERE id = ${id}
      `
    } catch (e) {
      if (!isPostgresUndefinedColumnError(e)) throw e
      try {
        await sql`
          UPDATE "User" SET "hydroNavAccess" = ${hydroJson}, "updatedAt" = now() WHERE id = ${id}
        `
      } catch (e2) {
        if (!isPostgresUndefinedColumnError(e2)) throw e2
      }
    }
  }

  if (patch.fullName !== undefined) {
    await sql`UPDATE "User" SET "fullName" = ${patch.fullName.trim()}, "updatedAt" = now() WHERE id = ${id}`
  }
  if (patch.jobTitle !== undefined) {
    try {
      await sql`UPDATE "User" SET job_title = ${patch.jobTitle?.trim() || null}, "updatedAt" = now() WHERE id = ${id}`
    } catch (e) {
      if (!isPostgresUndefinedColumnError(e)) throw e
    }
  }
  if (patch.role !== undefined) {
    await sql`UPDATE "User" SET role = ${patch.role}, "updatedAt" = now() WHERE id = ${id}`
  }
  if (patch.department !== undefined) {
    await sql`UPDATE "User" SET department = ${patch.department}, "updatedAt" = now() WHERE id = ${id}`
  }
  if (patch.status !== undefined) {
    try {
      await sql`UPDATE "User" SET status = ${patch.status}, "updatedAt" = now() WHERE id = ${id}`
    } catch (e) {
      if (!isPostgresUndefinedColumnError(e)) throw e
    }
  }
  if (patch.mustChangePassword !== undefined) {
    try {
      await sql`
        UPDATE "User" SET must_change_password = ${patch.mustChangePassword}, "updatedAt" = now()
        WHERE id = ${id}
      `
    } catch (e) {
      if (!isPostgresUndefinedColumnError(e)) throw e
    }
  }

  let rows: Record<string, unknown>[] = []
  for (const profile of [0, 1, 2, 3] as UserListColProfile[]) {
    try {
      const cols =
        profile === 0
          ? sql`id, email, "fullName", job_title, role, department, status, must_change_password, "createdAt", "departmentSectionAccess", "hydroNavAccess"`
          : profile === 1
            ? sql`id, email, "fullName", role, department, status, must_change_password, "createdAt", "departmentSectionAccess", "hydroNavAccess"`
            : profile === 2
              ? sql`id, email, "fullName", role, department, status, must_change_password, "createdAt", "hydroNavAccess"`
              : sql`id, email, "fullName", role, department, status, must_change_password, "createdAt"`
      rows = (await sql`
        SELECT ${cols}
        FROM "User" WHERE id = ${id}
      `) as Record<string, unknown>[]
      break
    } catch (e) {
      if (!isPostgresUndefinedColumnError(e)) throw e
    }
  }
  if (!rows.length) return null

  const platformRoles = await loadUserPlatformRoles(id)
  return mapUserRow(rows[0] as Record<string, unknown>, platformRoles)
}

export async function softDeleteAdminUser(id: string): Promise<boolean> {
  const sql = getSql()
  try {
    const rows = await sql`
      UPDATE "User" SET deleted_at = now(), status = 'disabled', "updatedAt" = now()
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING id
    `
    return rows.length > 0
  } catch (e) {
    if (!isPostgresUndefinedColumnError(e)) throw e
    const rows = await sql`
      UPDATE "User" SET status = 'disabled', "updatedAt" = now()
      WHERE id = ${id} RETURNING id
    `
    return rows.length > 0
  }
}

export async function resetAdminUserPassword(
  id: string,
  password: string,
  mustChange = true,
): Promise<boolean> {
  const sql = getSql()
  const passwordHash = await bcrypt.hash(password, 10)
  try {
    const rows = await sql`
      UPDATE "User"
      SET "passwordHash" = ${passwordHash},
          must_change_password = ${mustChange},
          failed_login_count = 0,
          locked_until = NULL,
          "updatedAt" = now()
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING id
    `
    return rows.length > 0
  } catch (e) {
    if (!isPostgresUndefinedColumnError(e)) throw e
    const rows = await sql`
      UPDATE "User" SET "passwordHash" = ${passwordHash}, "updatedAt" = now()
      WHERE id = ${id} RETURNING id
    `
    return rows.length > 0
  }
}

export async function findUserIdByEmail(email: string): Promise<string | null> {
  const sql = getSql()
  const rows = await sql`
    SELECT id FROM "User" WHERE lower(trim(email)) = ${email.trim().toLowerCase()} LIMIT 1
  `
  return rows[0] ? String((rows[0] as { id: string }).id) : null
}

export function isUniqueViolationError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false
  const code = (e as { code?: string }).code
  return code === '23505'
}
