import { allocateUsernameFromEmail } from '@/lib/admin-users-mock'
import { listPlatformRoles } from '@/lib/db/rbac-persistence'
import { inviteExpiryMs, signInvite } from '@/lib/invite-token'
import {
  inviteSetPasswordUrl,
  isSmtpConfigured,
  sendAdminInviteNotification,
  sendPasswordInviteEmail,
} from '@/lib/mail'
import { withSuperAdminAuth } from '@/lib/super-admin/api-auth'
import { auditMetaFromRequest, writeAuditLog } from '@/lib/super-admin/audit-log'
import {
  createAdminUserInvited,
  isUniqueViolationError,
  listAdminUsers,
  normalizeCreateUserInput,
} from '@/lib/super-admin/users-admin'

function appPublicName(): string {
  return process.env.NEXT_PUBLIC_APP_NAME?.trim() || 'NWRMA ERP'
}

export async function GET(req: Request) {
  return withSuperAdminAuth(req, 'users', 'read', async () => {
    const url = new URL(req.url)
    const search = url.searchParams.get('search') ?? undefined
    const status = url.searchParams.get('status') ?? undefined
    const limit = Number(url.searchParams.get('limit') ?? 100)
    const offset = Number(url.searchParams.get('offset') ?? 0)
    const includePlatformRoles =
      url.searchParams.get('includePlatformRoles') === '1' ||
      url.searchParams.get('includePlatformRoles') === 'true'
    const result = await listAdminUsers({
      search,
      status,
      limit,
      offset,
      includePlatformRoles,
    })
    return Response.json(result)
  })
}

export async function POST(req: Request) {
  return withSuperAdminAuth(req, 'users', 'create', async (viewer, req) => {
    let body: Record<string, unknown>
    try {
      body = (await req.json()) as Record<string, unknown>
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const email = typeof body.email === 'string' ? body.email : ''
    const fullName = typeof body.fullName === 'string' ? body.fullName : ''
    const role = typeof body.role === 'string' ? body.role : 'staff'
    const department =
      body.department === null || body.department === undefined
        ? null
        : String(body.department)
    const jobTitleRaw =
      typeof body.jobTitle === 'string'
        ? body.jobTitle
        : typeof body.title === 'string'
          ? body.title
          : null
    let roleIds = Array.isArray(body.roleIds)
      ? body.roleIds.filter((x): x is string => typeof x === 'string')
      : undefined

    if (!roleIds?.length) {
      try {
        const allRoles = await listPlatformRoles()
        const defaultRole =
          allRoles.find((r) => r.code !== 'super_admin') ?? allRoles[0]
        if (defaultRole) roleIds = [defaultRole.id]
      } catch {
        /* listPlatformRoles may fail if RBAC tables are missing */
      }
    }

    const normalized = normalizeCreateUserInput({
      email,
      fullName,
      role,
      department,
      jobTitle: jobTitleRaw,
      roleIds,
    })
    if (!normalized.ok) {
      return Response.json({ error: normalized.error }, { status: 400 })
    }

    const { data } = normalized

    let platformRoleCodes: string[] = []
    try {
      const allRoles = await listPlatformRoles()
      platformRoleCodes = allRoles
        .filter((r) => data.roleIds?.includes(r.id))
        .map((r) => r.code)
    } catch {
      platformRoleCodes = []
    }

    let rawToken: string
    try {
      rawToken = signInvite(
        {
          email: data.email,
          fullName: data.fullName,
          username: allocateUsernameFromEmail(data.email),
          role: data.role,
          department: data.department,
        },
        inviteExpiryMs(),
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Invite signing failed'
      return Response.json({ error: msg }, { status: 500 })
    }

    const inviteUrl = inviteSetPasswordUrl(rawToken)
    const label = appPublicName()

    try {
      const user = await createAdminUserInvited({
        email: data.email,
        fullName: data.fullName,
        role: data.role,
        department: data.department,
        jobTitle: data.jobTitle,
        roleIds: data.roleIds,
      })

      const meta = auditMetaFromRequest(req)
      await writeAuditLog({
        actorId: viewer.id,
        action: 'user.create',
        entityType: 'user',
        entityId: user.id,
        newValue: {
          email: user.email,
          role: user.role,
          department: user.department,
          jobTitle: user.jobTitle,
          platformRole: platformRoleCodes.length ? platformRoleCodes : user.platformRoles,
          inviteSent: true,
        },
        ...meta,
      })

      if (!isSmtpConfigured()) {
        return Response.json(
          {
            ...user,
            invitationEmailDispatched: false,
            smtpConfigured: false,
            inviteUrl,
            message:
              'User created. SMTP is not configured — share the set-password link manually or configure SMTP in .env.local.',
          },
          { status: 201 },
        )
      }

      try {
        await sendPasswordInviteEmail({
          to: data.email,
          fullName: data.fullName,
          inviteUrl,
          appLabel: label,
        })
      } catch (err) {
        console.error('[super-admin/users] SMTP send failed', err)
        return Response.json(
          {
            ...user,
            invitationEmailDispatched: false,
            error:
              'User was created but the invitation email could not be sent. Check SMTP settings.',
            inviteUrl,
          },
          { status: 502 },
        )
      }

      try {
        await sendAdminInviteNotification({
          invitedEmail: data.email,
          invitedName: data.fullName,
          role: data.role,
          appLabel: label,
        })
      } catch (notifyErr) {
        console.warn('[super-admin/users] Admin notification email failed', notifyErr)
      }

      return Response.json(
        {
          ...user,
          invitationEmailDispatched: true,
          smtpConfigured: true,
          message: `Invitation email sent to ${data.email}.`,
        },
        { status: 201 },
      )
    } catch (e) {
      if (isUniqueViolationError(e)) {
        return Response.json(
          { error: 'A user with this email address already exists.' },
          { status: 400 },
        )
      }
      throw e
    }
  })
}
