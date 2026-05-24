import { NextResponse } from 'next/server'
import { signInvite, inviteExpiryMs } from '@/lib/invite-token'
import {
  inviteSetPasswordUrl,
  isSmtpConfigured,
  sendAdminInviteNotification,
  sendPasswordInviteEmail,
} from '@/lib/mail'
import { coerceHydroNavAccess, hydroNavAccessAllowsAny } from '@/lib/hydro-nav-access'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { tryRespondWithDbSetupHint } from '@/lib/db'
import {
  canInviteRole,
  canInviteUsers,
  isValidInviteDepartment,
} from '@/lib/settings-access-policy'
import { upsertPendingInviteUser } from '@/lib/user-invite-persistence'

import { normalizeErpDepartmentKey } from '@/lib/hydrological-services-merge'
import type { Department, HydroNavAccess, Role } from '@/lib/types'

const VALID_ROLES = new Set(['admin', 'hod', 'dg', 'staff'])
const VALID_DEPTS = new Set([
  'hydrological',
  'boreholes',
  'financial',
  'hr',
  'compliance',
])

function appPublicName(): string {
  return process.env.APP_PUBLIC_NAME?.trim() || 'NWRMA ERP'
}

export async function POST(req: Request) {
  const viewer = await resolveDemoViewerFromRequest(req)
  if (!viewer) {
    return NextResponse.json(
      {
        error:
          'Authentication required. Sign in with a valid account (session cookie), then try again.',
      },
      { status: 401 },
    )
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : ''
  const username = typeof body.username === 'string' ? body.username.trim() : ''
  const role = typeof body.role === 'string' ? body.role : ''
  const departmentRaw = body.department
  const normalizedDept =
    typeof departmentRaw === 'string' ? normalizeErpDepartmentKey(departmentRaw) : null
  const department =
    departmentRaw === null || departmentRaw === undefined
      ? null
      : normalizedDept && VALID_DEPTS.has(normalizedDept)
        ? normalizedDept
        : null

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  if (!emailOk || !fullName || !username || !VALID_ROLES.has(role)) {
    return NextResponse.json(
      { error: 'Valid email, full name, username, and role are required' },
      { status: 400 },
    )
  }

  if (role === 'admin') {
    return NextResponse.json(
      { error: 'Platform administrator accounts cannot be created via invite.' },
      { status: 403 },
    )
  }

  if (!canInviteUsers(viewer)) {
    return NextResponse.json(
      { error: 'You do not have permission to send user invitations.' },
      { status: 403 },
    )
  }

  const inviteRole = role as Role
  const inviteDept: Department =
    inviteRole === 'dg'
      ? null
      : department && isValidInviteDepartment(department as Department)
        ? (department as Exclude<Department, null>)
        : null

  if (inviteRole === 'dg' && inviteDept != null) {
    return NextResponse.json(
      { error: 'Director General must not have a department.' },
      { status: 400 },
    )
  }

  if ((inviteRole === 'hod' || inviteRole === 'staff') && !inviteDept) {
    return NextResponse.json(
      { error: 'Department is required for HOD and staff roles.' },
      { status: 400 },
    )
  }

  if (!canInviteRole(viewer, inviteRole, inviteDept)) {
    return NextResponse.json(
      {
        error:
          inviteRole === 'dg'
            ? 'You do not have permission to invite a Director General.'
            : inviteRole === 'hod'
              ? 'You do not have permission to invite a Head of Department for that department.'
              : 'You can only invite staff into your own department.',
      },
      { status: 403 },
    )
  }

  let tokenExtras: { hydroNavAccess?: HydroNavAccess } = {}
  if (inviteRole === 'staff' && inviteDept === 'hydrological') {
    const flags = coerceHydroNavAccess(body.hydroNavAccess)
    if (!hydroNavAccessAllowsAny(flags)) {
      return NextResponse.json(
        { error: 'Select at least one Hydrological access area.' },
        { status: 400 },
      )
    }
    tokenExtras = { hydroNavAccess: flags }
  }

  let rawToken: string
  try {
    rawToken = signInvite(
      {
        email,
        fullName,
        username,
        role,
        department: inviteRole === 'hod' || inviteRole === 'staff' ? inviteDept : null,
        ...tokenExtras,
      },
      inviteExpiryMs(),
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invite signing failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  const inviteUrl = inviteSetPasswordUrl(rawToken)
  const label = appPublicName()
  const inviteExpiresAt = new Date(Date.now() + inviteExpiryMs())
  const hydroNavAccess =
    inviteRole === 'staff' && inviteDept === 'hydrological'
      ? (tokenExtras.hydroNavAccess ?? null)
      : null

  const persistResponse = await tryRespondWithDbSetupHint(async () => {
    await upsertPendingInviteUser({
      email,
      fullName,
      role,
      department: inviteRole === 'hod' || inviteRole === 'staff' ? inviteDept : null,
      hydroNavAccess,
      inviteExpiresAt,
    })
    return NextResponse.json({ ok: true })
  })
  if (persistResponse.status !== 200) {
    const body = (await persistResponse.json()) as { error?: string; hint?: string }
    return NextResponse.json(
      {
        error: body.error ?? 'Could not save invited user to the directory.',
        hint: body.hint,
      },
      { status: persistResponse.status === 503 ? 503 : 500 },
    )
  }

  if (!isSmtpConfigured()) {
    return NextResponse.json({
      ok: true,
      invitationEmailDispatched: false,
      smtpConfigured: false,
      inviteUrl,
      directoryUpdated: true,
      message:
        'SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env.local to send emails.',
    })
  }

  try {
    await sendPasswordInviteEmail({
      to: email,
      fullName,
      inviteUrl,
      appLabel: label,
    })
  } catch (err) {
    console.error('[invite] SMTP send failed', err)
    return NextResponse.json(
      {
        error:
          'Could not send the invitation email. Check SMTP settings (Gmail App Password, SMTP_FROM, firewall).',
        directoryUpdated: true,
        hint: 'The user was added to the directory. Use Resend invitation after fixing SMTP.',
      },
      { status: 502 },
    )
  }

  try {
    await sendAdminInviteNotification({
      invitedEmail: email,
      invitedName: fullName,
      role,
      appLabel: label,
    })
  } catch (notifyErr) {
    console.warn('[invite] Admin notification email failed (invite still sent)', notifyErr)
  }

  return NextResponse.json({
    ok: true,
    invitationEmailDispatched: true,
    smtpConfigured: true,
    notifyDispatched: Boolean(process.env.SMTP_NOTIFY_TO?.trim()),
  })
}
