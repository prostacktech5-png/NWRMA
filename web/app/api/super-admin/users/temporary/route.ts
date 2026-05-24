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
  createTemporaryUserInvited,
  isUniqueViolationError,
  normalizeTemporaryUserInput,
} from '@/lib/super-admin/users-admin'

function appPublicName(): string {
  return process.env.NEXT_PUBLIC_APP_NAME?.trim() || 'NWRMA ERP'
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
    const department =
      body.department === null || body.department === undefined
        ? null
        : String(body.department)
    const accountExpiresAt = body.accountExpiresAt

    const normalized = normalizeTemporaryUserInput({
      email,
      fullName,
      department,
      accountExpiresAt,
    })
    if (!normalized.ok) {
      return Response.json({ error: normalized.error }, { status: 400 })
    }

    const { data } = normalized

    let roleIds: string[] | undefined
    try {
      const allRoles = await listPlatformRoles()
      const defaultRole =
        allRoles.find((r) => r.code !== 'super_admin') ?? allRoles[0]
      if (defaultRole) roleIds = [defaultRole.id]
    } catch {
      roleIds = undefined
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
      const user = await createTemporaryUserInvited({
        email: data.email,
        fullName: data.fullName,
        department: data.department,
        accountExpiresAt: data.accountExpiresAt,
        roleIds,
      })

      const meta = auditMetaFromRequest(req)
      await writeAuditLog({
        actorId: viewer.id,
        action: 'user.create_temporary',
        entityType: 'user',
        entityId: user.id,
        newValue: {
          email: user.email,
          role: user.role,
          department: user.department,
          accountExpiresAt: data.accountExpiresAt.toISOString(),
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
              'Temporary user created. SMTP is not configured — share the set-password link manually.',
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
        console.error('[super-admin/users/temporary] SMTP send failed', err)
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
        console.warn('[super-admin/users/temporary] Admin notification failed', notifyErr)
      }

      return Response.json(
        {
          ...user,
          invitationEmailDispatched: true,
          smtpConfigured: true,
          message: `Invitation email sent to ${data.email}. Access ends ${data.accountExpiresAt.toLocaleString()}.`,
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
