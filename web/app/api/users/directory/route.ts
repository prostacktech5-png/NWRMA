import { tryRespondWithDbSetupHint, isPostgresUndefinedColumnError } from '@/lib/db'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import {
  canListDirectoryUser,
  canViewUserDirectory,
} from '@/lib/settings-access-policy'
import { normalizeErpDepartmentKey } from '@/lib/hydrological-services-merge'
import type { Department, Role, User, HydroNavAccess } from '@/lib/types'
import { parseStoredHydroNavAccess } from '@/lib/hydro-nav-access'
import { isPendingInvitePasswordHash } from '@/lib/user-invite-persistence'

function rowToUser(r: Record<string, unknown>): User | null {
  const id = String(r.id ?? '').trim()
  const email = typeof r.email === 'string' ? r.email.trim().toLowerCase() : ''
  const name = String(r.fullName ?? r.full_name ?? '').trim()
  const roleRaw = String(r.role ?? '').trim().toLowerCase()
  if (!id || !email || !name) return null
  if (!['admin', 'dg', 'hod', 'staff'].includes(roleRaw)) return null
  const role = roleRaw as Role
  const normalizedDept = r.department != null ? normalizeErpDepartmentKey(String(r.department)) : null
  const validDept =
    normalizedDept &&
    ['hydrological', 'boreholes', 'financial', 'hr', 'compliance'].includes(normalizedDept)
      ? normalizedDept
      : null

  let department: Department = null
  if (role === 'hod' || role === 'staff') {
    department = validDept
    if (!department) return null
  }

  const createdAt = r.createdAt != null ? new Date(String(r.createdAt)) : new Date()

  let hydroNavAccess: HydroNavAccess | null = null
  if (role === 'staff' && validDept === 'hydrological') {
    hydroNavAccess = parseStoredHydroNavAccess(r.hydroNavAccess)
  }

  const passwordHash = String(r.passwordHash ?? r.password_hash ?? '')
  const pendingPasswordSetup = isPendingInvitePasswordHash(passwordHash)
  let inviteExpired = false
  if (pendingPasswordSetup && r.inviteExpiresAt != null) {
    const exp = new Date(String(r.inviteExpiresAt))
    if (!Number.isNaN(exp.getTime())) {
      inviteExpired = Date.now() > exp.getTime()
    }
  }

  return {
    id,
    email,
    name,
    role,
    department,
    status: 'active',
    createdAt,
    hydroNavAccess,
    pendingPasswordSetup,
    inviteExpired,
  }
}

function viewerMayListUser(
  viewer: NonNullable<Awaited<ReturnType<typeof resolveDemoViewerFromRequest>>>,
  u: User
): boolean {
  return canListDirectoryUser(viewer, {
    id: u.id,
    role: u.role,
    department: u.department,
  })
}

/**
 * GET — users from Prisma `"User"` table (scoped for HOD by department).
 */
export async function GET(req: Request) {
  const viewer = await resolveDemoViewerFromRequest(req)
  if (!viewer) {
    return Response.json(
      { error: 'Authentication required.', hint: 'Sign in again to load the user directory.' },
      { status: 401 }
    )
  }

  if (!canViewUserDirectory(viewer)) {
    return Response.json({ error: 'You do not have permission to view the user directory.' }, { status: 403 })
  }

  return tryRespondWithDbSetupHint(async () => {
    const { getSql } = await import('@/lib/db')
    const sql = getSql()
    let rows: Record<string, unknown>[]
    try {
      rows = (await sql`
        SELECT id, email, "fullName", role, department, "createdAt", "hydroNavAccess",
          "passwordHash", "inviteExpiresAt"
        FROM "User"
        ORDER BY "createdAt" ASC
      `) as Record<string, unknown>[]
    } catch (e) {
      if (isPostgresUndefinedColumnError(e)) {
        try {
          rows = (await sql`
            SELECT id, email, "fullName", role, department, "createdAt", "hydroNavAccess",
              "passwordHash"
            FROM "User"
            ORDER BY "createdAt" ASC
          `) as Record<string, unknown>[]
        } catch (e2) {
          if (isPostgresUndefinedColumnError(e2)) {
            rows = (await sql`
              SELECT id, email, "fullName", role, department, "createdAt"
              FROM "User"
              ORDER BY "createdAt" ASC
            `) as Record<string, unknown>[]
            for (const r of rows) {
              r.hydroNavAccess = null
              r.passwordHash = null
            }
          } else {
            throw e2
          }
        }
        for (const r of rows) {
          if (r.inviteExpiresAt === undefined) r.inviteExpiresAt = null
        }
      } else {
        throw e
      }
    }

    const users = rows
      .map(rowToUser)
      .filter((u): u is User => u !== null)
      .filter((u) => viewerMayListUser(viewer, u))

    return Response.json({ ok: true, users })
  })
}
