/** Client-safe audit types and display helpers (no Postgres). */

export type AuditLogEntry = {
  id: string
  timestamp: string
  actorId: string | null
  actorEmail: string | null
  actorName: string | null
  actorRole: string | null
  actorLabel: string
  actorDisplay: string
  action: string
  actionCategory: string
  actionDescription: string
  event: string
  target: string
  entityType: string
  entityId: string | null
  ip: string | null
  status: 'success' | 'failed'
  source: 'platform' | 'auth'
}

/** Normalize stored/display IPs (IPv4-mapped IPv6, loopback). */
export function formatDisplayIp(raw: string | null | undefined): string | null {
  if (raw == null || !String(raw).trim()) return null
  const ip = String(raw).trim()
  const v4Mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip)
  if (v4Mapped) return v4Mapped[1]
  if (ip === '::1' || ip === '0:0:0:0:0:0:0:1') return '127.0.0.1 (localhost)'
  if (ip.toLowerCase() === 'localhost') return '127.0.0.1 (localhost)'
  return ip
}

/** Local display timestamp: 2026-05-17 08:15AM */
export function formatAuditTimestampDisplay(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  const y = d.getFullYear()
  const mo = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  let hours = d.getHours()
  const minutes = pad(d.getMinutes())
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  if (hours === 0) hours = 12
  return `${y}-${mo}-${day} ${pad(hours)}:${minutes}${ampm}`
}

const PLATFORM_ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  regional_manager: 'Regional Manager',
  district_officer: 'District Officer',
  field_officer: 'Field Officer',
  data_entry_clerk: 'Data Entry Clerk',
  gis_officer: 'GIS Officer',
  water_quality_officer: 'Water Quality Officer',
  finance_officer: 'Finance Officer',
  read_only_auditor: 'Read-only Auditor',
}

const ERP_ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  dg: 'Director General',
  hod: 'Head of Department',
  staff: 'Staff',
}

function parseJsonValue(value: unknown): Record<string, unknown> | null {
  if (value == null) return null
  if (typeof value === 'object') return value as Record<string, unknown>
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown
      return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null
    } catch {
      return null
    }
  }
  return null
}

function actorFirstName(fullName: string | null, email: string | null): string {
  if (fullName?.trim()) {
    const first = fullName.trim().split(/\s+/)[0]
    if (first) return first
  }
  if (email?.includes('@')) {
    const local = email.split('@')[0] ?? ''
    const token = local.replace(/[._+-]/g, ' ').trim().split(/\s+/)[0]
    if (token) return token.charAt(0).toUpperCase() + token.slice(1)
  }
  return 'User'
}

export function formatActorDisplay(
  role: string | null,
  fullName: string | null,
  email: string | null,
  platformRoleCode?: string | null,
  isAnonymous?: boolean,
): string {
  if (isAnonymous) return 'Anonymous'
  if (!role && !email && !fullName) return 'System'

  const roleLabel =
    (platformRoleCode && PLATFORM_ROLE_LABELS[platformRoleCode]) ||
    (role && ERP_ROLE_LABELS[role]) ||
    (role ? role.replace(/_/g, ' ') : 'User')

  const name = actorFirstName(fullName, email)
  return `${roleLabel} - ${name}`
}

export function formatActionCategory(
  action: string,
  status: 'success' | 'failed',
): string {
  const denied = action.includes('.denied')
  const failed = status === 'failed' && !denied

  const map: Record<string, string> = {
    'auth.login.success': 'LOGIN SUCCESS',
    'auth.login.failure': 'LOGIN FAILED',
    'auth.login.denied': 'LOGIN DENIED',
    'user.create': 'CREATED USER',
    'user.update': 'UPDATED USER',
    'user.delete': 'DELETED USER',
    'user.reset_password': 'RESET PASSWORD',
    'user.roles.update': 'UPDATED ROLES',
    'role.permissions.update': 'UPDATED PERMISSIONS',
    'session.revoke': 'REVOKED SESSION',
    'backup.run': 'RAN BACKUP',
    'system.settings.update': 'UPDATED SETTINGS',
    'borehole.update': 'UPDATED RECORD',
    'borehole.soft_delete': 'DELETED RECORD',
    'borehole.restore': 'RESTORED RECORD',
    'borehole.delete': 'DELETED RECORD',
  }

  if (map[action]) return map[action]
  if (denied) return 'ACCESS DENIED'
  if (failed) return 'ACTION FAILED'

  const words = action
    .replace(/\./g, ' ')
    .replace(/_/g, ' ')
    .trim()
    .toUpperCase()
  return words || 'SYSTEM ACTION'
}

function entityRef(entityType: string, entityId: string | null): string {
  if (entityId) return entityId
  return entityType.replace(/_/g, ' ')
}

export function formatEventDescription(
  action: string,
  entityType: string,
  entityId: string | null,
  newValue?: unknown,
  reason?: string | null,
  actorEmail?: string | null,
): string {
  const payload = parseJsonValue(newValue)
  const email =
    (payload && typeof payload.email === 'string' ? payload.email : null) ??
    actorEmail ??
    null
  const ref = entityRef(entityType, entityId)

  switch (action) {
    case 'auth.login.success':
      return 'Signed in to the ERP system'
    case 'auth.login.failure':
      return email
        ? `Failed sign-in attempt for ${email}`
        : 'Failed sign-in attempt with invalid credentials'
    case 'auth.login.denied':
      if (reason === 'account_disabled') {
        return email
          ? `Sign-in blocked for ${email} — account disabled`
          : 'Sign-in blocked — account disabled'
      }
      if (reason === 'account_locked') {
        return email
          ? `Sign-in blocked for ${email} — account temporarily locked`
          : 'Sign-in blocked — account temporarily locked'
      }
      if (reason === 'invite_pending') {
        return email
          ? `Sign-in blocked for ${email} — invitation not completed`
          : 'Sign-in blocked — invitation not completed'
      }
      return email ? `Sign-in denied for ${email}` : 'Sign-in denied'
    case 'user.create':
      return email ? `User account created for ${email}` : 'New user account created'
    case 'user.update':
      return email ? `User account updated for ${email}` : 'User account updated'
    case 'user.delete':
      return email ? `User account removed for ${email}` : 'User account removed'
    case 'user.reset_password':
      return email ? `Password reset for ${email}` : 'User password reset'
    case 'user.roles.update':
      return email ? `Platform roles updated for ${email}` : 'User platform roles updated'
    case 'role.permissions.update':
      return `Permissions updated for role ${ref}`
    case 'session.revoke':
      return `Active session revoked for user ${ref}`
    case 'backup.run':
      return 'Platform backup job started'
    case 'system.settings.update': {
      const keys =
        payload && typeof payload.keys === 'object' && payload.keys !== null
          ? Object.keys(payload.keys as Record<string, unknown>).join(', ')
          : null
      return keys
        ? `System settings updated (${keys})`
        : 'System settings updated'
    }
    case 'borehole.update': {
      const licenseStatus =
        payload && typeof payload.licenseStatus === 'string'
          ? payload.licenseStatus
          : payload && typeof payload.license_status === 'string'
            ? payload.license_status
            : null
      if (licenseStatus) {
        return `Borehole ${ref} updated — licence status set to ${licenseStatus.replace(/_/g, ' ')}`
      }
      return `Borehole record ${ref} updated`
    }
    case 'borehole.soft_delete':
      return `Borehole record ${ref} archived and removed from active registry`
    case 'borehole.restore':
      return `Borehole record ${ref} restored to active registry`
    case 'borehole.delete':
      return `Borehole record ${ref} deleted`
    default: {
      if (reason) {
        const readable = reason.replace(/_/g, ' ')
        return `${readable.charAt(0).toUpperCase()}${readable.slice(1)} on ${ref}`
      }
      const verb = action.split('.').pop()?.replace(/_/g, ' ') ?? 'changed'
      return `${entityType.replace(/_/g, ' ')} ${ref} ${verb}`
    }
  }
}
