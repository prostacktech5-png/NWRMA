import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { tryRespondWithDbSetupHint } from '@/lib/db'
import {
  accountExpiryLoginMessage,
  isAccountExpired,
  parseAccountExpiresAt,
} from '@/lib/account-expiry'
import { findRecordByEmail } from '@/lib/local-password-store'
import { isPendingInvitePasswordHash } from '@/lib/user-invite-persistence'
import { applySessionToResponse } from '@/lib/session-cookies'
import { auditMetaFromRequest, writeAuthAuditLog } from '@/lib/super-admin/audit-log'
import {
  getUserLoginLock,
  incrementFailedLogin,
  recordLoginEvent,
  resetFailedLogin,
} from '@/lib/super-admin/login-events'
import { sessionMetaForUser } from '@/lib/session-bootstrap'
import { createUserSession } from '@/lib/super-admin/session'
import { normalizeErpDepartmentKey } from '@/lib/hydrological-services-merge'
import type { User } from '@/lib/types'
import {
  normalizeDirectorGeneralUser,
  persistDirectorGeneralNormalization,
} from '@/lib/dg-user-normalize'
import {
  normalizeLegacyAdminUser,
  persistLegacyAdminMigration,
} from '@/lib/legacy-admin-user'

function jsonUser(u: User) {
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

async function finalizeLoginUser(user: User): Promise<User> {
  if (user.role === 'admin') {
    await persistLegacyAdminMigration(user.id)
    return normalizeLegacyAdminUser(user)
  }
  if (user.role === 'dg') {
    await persistDirectorGeneralNormalization(user.id)
    return normalizeDirectorGeneralUser(user)
  }
  return user
}

async function loginSuccessResponse(user: User, accessToken?: string | null, req?: Request) {
  const sessionUser = await finalizeLoginUser(user)
  await resetFailedLogin(sessionUser.id)
  const meta = req ? auditMetaFromRequest(req) : { ip: null, userAgent: null }
  await recordLoginEvent({
    userId: sessionUser.id,
    emailAttempt: sessionUser.email,
    success: true,
    ...meta,
  })
  await writeAuthAuditLog({
    actorId: sessionUser.id,
    action: 'auth.login.success',
    email: sessionUser.email,
    ...meta,
  })
  let signedSession: string | null = null
  if (process.env.DATABASE_URL?.trim()) {
    try {
      const created = await createUserSession(sessionUser.id, meta)
      signedSession = created.signedCookie
    } catch {
      signedSession = null
    }
  }
  const { platformRoles, canAccessSuperAdmin } = await sessionMetaForUser(sessionUser)
  const res = NextResponse.json({
    ok: true,
    user: jsonUser(sessionUser),
    platformRoles,
    canAccessSuperAdmin,
  })
  applySessionToResponse(res, {
    userId: sessionUser.id,
    accessToken: accessToken ?? null,
    signedSession,
  })
  return res
}

function mapUpstreamRemoteUser(remote: Record<string, unknown>): User | null {
  const id = typeof remote.id === 'string' ? remote.id : ''
  const emailRaw = typeof remote.email === 'string' ? remote.email.trim().toLowerCase() : ''
  const phoneRaw = typeof remote.phone === 'string' ? remote.phone.trim() : ''
  const name = typeof remote.fullName === 'string' ? remote.fullName.trim() : ''
  const roleRaw = typeof remote.role === 'string' ? remote.role.trim() : ''
  if (!id || !name || !['admin', 'dg', 'hod', 'staff'].includes(roleRaw)) return null

  const deptRaw =
    typeof remote.department === 'string' ? remote.department.trim().toLowerCase() : ''

  let department: User['department'] = null

  const normalizedDept = deptRaw ? normalizeErpDepartmentKey(deptRaw) : null
  const validDept =
    normalizedDept &&
    ['hydrological', 'boreholes', 'financial', 'hr', 'compliance'].includes(normalizedDept)
      ? normalizedDept
      : null

  if ((roleRaw === 'hod' || roleRaw === 'staff') && !validDept) {
    return null
  }

  if (roleRaw === 'hod' || roleRaw === 'staff') {
    department = validDept ?? null
  }

  let createdAt = new Date()
  if (typeof remote.createdAt === 'string') {
    const d = new Date(remote.createdAt)
    if (!Number.isNaN(d.getTime())) createdAt = d
  }

  const email =
    emailRaw ||
    (phoneRaw !== ''
      ? `${phoneRaw.replace(/\D+/g, '') || 'mobile'}@field.nwrma.gov.sl`
      : `${id.replace(/-/g, '').slice(0, 18) || 'user'}@field.nwrma.gov.sl`)

  return {
    id,
    email,
    name,
    role: roleRaw as User['role'],
    department,
    status: 'active',
    createdAt,
  }
}

async function tryNwrmaServerLogin(email: string, password: string) {
  const base = process.env.NWRMA_SERVER_URL?.trim()
  if (!base) return null
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = (await res.json()) as Record<string, unknown>

    const token =
      typeof data.token === 'string'
        ? data.token
        : typeof data.accessToken === 'string'
          ? data.accessToken
          : ''

    const userRaw = typeof data.user === 'object' && data.user !== null ? data.user : null
    if (!userRaw) return null
    const mapped = mapUpstreamRemoteUser(userRaw as Record<string, unknown>)
    if (!res.ok || !mapped || !token) return null

    return { user: mapped, token }
  } catch {
    return null
  }
}

function storedRecordToUser(stored: Awaited<ReturnType<typeof findRecordByEmail>>): User | null {
  if (!stored) return null
  const dept = stored.department
  const normalizedStored = dept ? normalizeErpDepartmentKey(dept) : null
  const validDept =
    normalizedStored &&
    ['hydrological', 'boreholes', 'financial', 'hr', 'compliance'].includes(normalizedStored)
  const role = stored.role
  const department =
    role === 'hod' || role === 'staff' ? (validDept ? normalizedStored : null) : null

  if ((role === 'hod' || role === 'staff') && !department) {
    return null
  }

  const user: User = {
    id: stored.id,
    email: stored.email,
    name: stored.fullName,
    role: role as User['role'],
    department,
    status: 'active',
    createdAt: new Date(stored.updatedAt),
    ...(role === 'staff' && department === 'hydrological'
      ? { hydroNavAccess: stored.hydroNavAccess }
      : {}),
  }

  if (!['admin', 'dg', 'hod', 'staff'].includes(user.role)) {
    return null
  }

  return user
}

async function authenticateViaPostgres(
  email: string,
  password: string,
  req: Request,
): Promise<NextResponse | null> {
  const stored = await findRecordByEmail(email)
  if (!stored) return null

  const accountExpiresAt = parseAccountExpiresAt(stored.accountExpiresAt)
  if (accountExpiresAt && isAccountExpired(accountExpiresAt)) {
    const meta = auditMetaFromRequest(req)
    await recordLoginEvent({
      userId: stored.id,
      emailAttempt: email,
      success: false,
      ...meta,
      reason: 'account_expired',
    })
    await writeAuthAuditLog({
      actorId: stored.id,
      action: 'auth.login.denied',
      email,
      reason: 'account_expired',
      ...meta,
    })
    return NextResponse.json(
      { error: accountExpiryLoginMessage(accountExpiresAt) },
      { status: 403 },
    )
  }

  if (isPendingInvitePasswordHash(stored.passwordHash)) {
    const meta = auditMetaFromRequest(req)
    await recordLoginEvent({
      userId: stored.id,
      emailAttempt: email,
      success: false,
      ...meta,
      reason: 'invite_pending',
    })
    await writeAuthAuditLog({
      actorId: stored.id,
      action: 'auth.login.denied',
      email,
      reason: 'invite_pending',
      ...meta,
    })
    return NextResponse.json(
      {
        error:
          'This account is not active yet. Open the invitation email and set your password first.',
      },
      { status: 403 },
    )
  }

  const lock = await getUserLoginLock(stored.id)
    if (lock.status === 'disabled') {
      const meta = auditMetaFromRequest(req)
      await recordLoginEvent({
        userId: stored.id,
        emailAttempt: email,
        success: false,
        ...meta,
        reason: 'account_disabled',
      })
      await writeAuthAuditLog({
        actorId: stored.id,
        action: 'auth.login.denied',
        email,
        reason: 'account_disabled',
        ...meta,
      })
      return NextResponse.json({ error: 'This account has been disabled.' }, { status: 403 })
    }
    if (lock.lockedUntil && lock.lockedUntil > new Date()) {
      const meta = auditMetaFromRequest(req)
      await recordLoginEvent({
        userId: stored.id,
        emailAttempt: email,
        success: false,
        ...meta,
        reason: 'account_locked',
      })
      await writeAuthAuditLog({
        actorId: stored.id,
        action: 'auth.login.denied',
        email,
        reason: 'account_locked',
        ...meta,
      })
      return NextResponse.json(
        { error: 'Account temporarily locked. Try again later.' },
        { status: 403 },
      )
    }

  const ok = await bcrypt.compare(password, stored.passwordHash)
    if (!ok) {
      const meta = auditMetaFromRequest(req)
      await incrementFailedLogin(stored.id)
      await recordLoginEvent({
        userId: stored.id,
        emailAttempt: email,
        success: false,
        ...meta,
        reason: 'invalid_password',
      })
      await writeAuthAuditLog({
        actorId: stored.id,
        action: 'auth.login.failure',
        email,
        reason: 'invalid_password',
        ...meta,
      })
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

  const user = storedRecordToUser(stored)
  if (!user) {
    return NextResponse.json(
      { error: 'Account is missing a valid department. Contact an administrator.' },
      { status: 403 },
    )
  }

  return await loginSuccessResponse(user, null, req)
}

async function handleLogin(req: Request): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const hasDatabase = Boolean(process.env.DATABASE_URL?.trim())

  if (hasDatabase) {
    const local = await authenticateViaPostgres(email, password, req)
    if (local) return local
  }

  const remote = await tryNwrmaServerLogin(email, password)
  if (remote) {
    return await loginSuccessResponse(remote.user, remote.token, req)
  }

  const meta = auditMetaFromRequest(req)
  await recordLoginEvent({
    emailAttempt: email,
    success: false,
    ...meta,
    reason: 'unknown_user',
  })
  await writeAuthAuditLog({
    actorId: null,
    action: 'auth.login.failure',
    email,
    reason: 'unknown_user',
    ...meta,
  })
  return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
}

export async function POST(req: Request) {
  return tryRespondWithDbSetupHint(() => handleLogin(req))
}
