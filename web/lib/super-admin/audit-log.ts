import { randomUUID } from 'crypto'
import { getSql, isPostgresUndefinedRelationError } from '@/lib/db'
import {
  formatActionCategory,
  formatActorDisplay,
  formatDisplayIp,
  formatEventDescription,
  type AuditLogEntry,
} from '@/lib/super-admin/audit-log-shared'

export type { AuditLogEntry } from '@/lib/super-admin/audit-log-shared'
export {
  formatActionCategory,
  formatActorDisplay,
  formatAuditTimestampDisplay,
  formatDisplayIp,
  formatEventDescription,
} from '@/lib/super-admin/audit-log-shared'

export type AuditLogInput = {
  actorId: string | null
  action: string
  entityType: string
  entityId?: string | null
  fieldName?: string | null
  oldValue?: unknown
  newValue?: unknown
  ip?: string | null
  userAgent?: string | null
}

export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    const sql = getSql()
    await sql`
      INSERT INTO platform_audit_log (
        id, actor_id, action, entity_type, entity_id, field_name,
        old_value, new_value, ip, user_agent
      ) VALUES (
        ${randomUUID()},
        ${input.actorId},
        ${input.action},
        ${input.entityType},
        ${input.entityId ?? null},
        ${input.fieldName ?? null},
        ${input.oldValue != null ? JSON.stringify(input.oldValue) : null},
        ${input.newValue != null ? JSON.stringify(input.newValue) : null},
        ${input.ip ?? null},
        ${input.userAgent ?? null}
      )
    `
  } catch (e) {
    if (isPostgresUndefinedRelationError(e)) return
    throw e
  }
}

export async function writeAuthAuditLog(input: {
  actorId: string | null
  action: 'auth.login.success' | 'auth.login.failure' | 'auth.login.denied'
  email: string
  reason?: string | null
  ip?: string | null
  userAgent?: string | null
}): Promise<void> {
  await writeAuditLog({
    actorId: input.actorId,
    action: input.action,
    entityType: 'auth',
    entityId: input.actorId,
    newValue: { email: input.email, reason: input.reason ?? null },
    ip: input.ip,
    userAgent: input.userAgent,
  })
}

export function auditMetaFromRequest(req: Request): { ip: string | null; userAgent: string | null } {
  const raw =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    null
  return { ip: formatDisplayIp(raw), userAgent: req.headers.get('user-agent') }
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function auditLogsToCsv(items: AuditLogEntry[]): string {
  const headers = [
    'Timestamp',
    'Actor',
    'Action',
    'Event',
    'IP address',
    'Status',
  ]
  const lines = [
    headers.join(','),
    ...items.map((row) =>
      [
        row.timestamp,
        row.actorDisplay,
        row.actionCategory,
        row.event,
        formatDisplayIp(row.ip) ?? '',
        row.status === 'success' ? 'Success' : 'Failed',
      ]
        .map((v) => csvEscape(String(v ?? '')))
        .join(','),
    ),
  ]
  return lines.join('\r\n')
}

/** @deprecated Use formatEventDescription from audit-log-shared */
export function formatAuditActionLabel(
  action: string,
  entityType: string,
  newValue?: unknown,
  reason?: string | null,
): string {
  return formatEventDescription(action, entityType, null, newValue, reason)
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

function derivePlatformStatus(action: string, newValue?: unknown): 'success' | 'failed' {
  if (
    action.includes('.failure') ||
    action.includes('.denied') ||
    action.includes('.error')
  ) {
    return 'failed'
  }
  const payload = parseJsonValue(newValue)
  if (payload && payload.success === false) return 'failed'
  return 'success'
}

function formatTarget(entityType: string, entityId: string | null, newValue?: unknown): string {
  const payload = parseJsonValue(newValue)
  if (entityType === 'auth') {
    if (payload && typeof payload.email === 'string') return payload.email
    return 'Account login'
  }
  if (entityId && payload && typeof payload.email === 'string') {
    return `${entityId.slice(0, 8)} ${payload.email}`
  }
  if (entityId) return entityId
  if (payload && typeof payload.email === 'string') return payload.email
  return entityType
}

function actorLabelFrom(
  email: string | null,
  userId: string | null,
  success?: boolean,
): string {
  if (email) return email
  if (userId) return userId.slice(0, 8)
  return success === false ? 'anonymous' : 'system'
}

type RawUnifiedRow = {
  id: string
  created_at: Date | string
  action: string
  entity_type: string
  entity_id: string | null
  actor_id: string | null
  actor_email: string | null
  actor_name: string | null
  actor_role: string | null
  platform_role_code: string | null
  email_attempt: string | null
  ip: string | null
  new_value: unknown
  reason: string | null
  success_flag: boolean | null
  source: 'platform' | 'auth'
}

function mapRawToEntry(row: RawUnifiedRow): AuditLogEntry {
  const isAuth = row.source === 'auth'
  const action = row.action
  const success = isAuth
    ? row.success_flag === true
    : derivePlatformStatus(action, row.new_value) === 'success'
  const status: 'success' | 'failed' = success ? 'success' : 'failed'

  const actorEmail = row.actor_email ?? (isAuth ? row.email_attempt : null)
  const reason = row.reason
  const isAnonymous = !row.actor_id && !actorEmail && status === 'failed'

  const event = formatEventDescription(
    action,
    row.entity_type,
    row.entity_id,
    row.new_value,
    reason,
    actorEmail,
  )

  return {
    id: `${row.source}:${row.id}`,
    timestamp: new Date(String(row.created_at)).toISOString(),
    actorId: row.actor_id,
    actorEmail,
    actorName: row.actor_name,
    actorRole: row.actor_role,
    actorLabel: actorLabelFrom(actorEmail, row.actor_id, success),
    actorDisplay: formatActorDisplay(
      row.actor_role,
      row.actor_name,
      actorEmail,
      row.platform_role_code,
      isAnonymous,
    ),
    action,
    actionCategory: formatActionCategory(action, status),
    actionDescription: event,
    event,
    target: isAuth
      ? row.email_attempt ?? 'Account login'
      : formatTarget(row.entity_type, row.entity_id, row.new_value),
    entityType: row.entity_type,
    entityId: row.entity_id,
    ip: formatDisplayIp(row.ip != null ? String(row.ip) : null),
    status,
    source: row.source,
  }
}

function dedupeAuthEntries(items: AuditLogEntry[]): AuditLogEntry[] {
  const platformAuthKeys = new Set<string>()
  for (const item of items) {
    if (item.source === 'platform' && item.action.startsWith('auth.')) {
      const bucket = item.timestamp.slice(0, 19)
      platformAuthKeys.add(`${bucket}|${item.actorEmail ?? ''}|${item.action}`)
    }
  }
  return items.filter((item) => {
    if (item.source !== 'auth' || !item.action.startsWith('auth.')) return true
    const bucket = item.timestamp.slice(0, 19)
    const key = `${bucket}|${item.actorEmail ?? ''}|${item.action}`
    return !platformAuthKeys.has(key)
  })
}

function matchesFilters(
  entry: AuditLogEntry,
  opts: {
    from?: Date
    to?: Date
    actor?: string
    action?: string
    q?: string
  },
): boolean {
  const ts = new Date(entry.timestamp).getTime()
  if (opts.from && ts < opts.from.getTime()) return false
  if (opts.to) {
    const end = new Date(opts.to)
    end.setHours(23, 59, 59, 999)
    if (ts > end.getTime()) return false
  }
  if (opts.actor?.trim()) {
    const needle = opts.actor.trim().toLowerCase()
    const hay = `${entry.actorDisplay} ${entry.actorEmail ?? ''} ${entry.actorName ?? ''}`.toLowerCase()
    if (!hay.includes(needle)) return false
  }
  if (opts.action?.trim()) {
    const prefix = opts.action.trim().toLowerCase()
    if (
      !entry.action.toLowerCase().startsWith(prefix) &&
      !entry.actionCategory.toLowerCase().startsWith(prefix)
    ) {
      return false
    }
  }
  if (opts.q?.trim()) {
    const needle = opts.q.trim().toLowerCase()
    const hay = [
      entry.action,
      entry.actionCategory,
      entry.event,
      entry.actionDescription,
      entry.target,
      entry.entityType,
      entry.actorEmail,
      entry.actorDisplay,
      entry.ip,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    if (!hay.includes(needle)) return false
  }
  return true
}

export async function listUnifiedAuditLogs(opts: {
  limit?: number
  offset?: number
  from?: string
  to?: string
  actor?: string
  action?: string
  q?: string
}): Promise<{ items: AuditLogEntry[]; total: number }> {
  const requestedLimit = opts.limit ?? 50
  const maxCap = requestedLimit > 200 ? 10_000 : 200
  const limit = Math.min(Math.max(requestedLimit, 1), maxCap)
  const offset = Math.max(opts.offset ?? 0, 0)
  const dbFetchLimit = Math.min(Math.max(limit + offset, 500), 10_000)
  const fromDate = opts.from ? new Date(opts.from) : undefined
  const toDate = opts.to ? new Date(opts.to) : undefined
  const filterOpts = {
    from: fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : undefined,
    to: toDate && !Number.isNaN(toDate.getTime()) ? toDate : undefined,
    actor: opts.actor,
    action: opts.action,
    q: opts.q,
  }

  try {
    const sql = getSql()

    let platformRows: Record<string, unknown>[]
    try {
      platformRows = await sql`
        SELECT
          p.id,
          p.created_at,
          p.action,
          p.entity_type,
          p.entity_id,
          p.actor_id,
          u.email AS actor_email,
          u."fullName" AS actor_name,
          u.role AS actor_role,
          sa.code AS platform_role_code,
          NULL::text AS email_attempt,
          p.ip,
          p.new_value,
          NULL::text AS reason,
          NULL::boolean AS success_flag,
          'platform'::text AS source
        FROM platform_audit_log p
        LEFT JOIN "User" u ON u.id = p.actor_id
        LEFT JOIN user_platform_roles upr ON upr.user_id = p.actor_id
        LEFT JOIN platform_roles sa ON sa.id = upr.role_id AND sa.code = 'super_admin'
        ORDER BY p.created_at DESC
        LIMIT ${dbFetchLimit}
      `
    } catch (e) {
      if (!isPostgresUndefinedRelationError(e)) throw e
      platformRows = await sql`
        SELECT
          p.id,
          p.created_at,
          p.action,
          p.entity_type,
          p.entity_id,
          p.actor_id,
          u.email AS actor_email,
          u."fullName" AS actor_name,
          u.role AS actor_role,
          NULL::text AS platform_role_code,
          NULL::text AS email_attempt,
          p.ip,
          p.new_value,
          NULL::text AS reason,
          NULL::boolean AS success_flag,
          'platform'::text AS source
        FROM platform_audit_log p
        LEFT JOIN "User" u ON u.id = p.actor_id
        ORDER BY p.created_at DESC
        LIMIT ${dbFetchLimit}
      `
    }

    let loginRows: Record<string, unknown>[]
    try {
      loginRows = await sql`
        SELECT
          l.id,
          l.created_at,
          CASE
            WHEN l.success THEN 'auth.login.success'
            WHEN l.reason IN ('account_disabled', 'account_locked', 'invite_pending') THEN 'auth.login.denied'
            ELSE 'auth.login.failure'
          END AS action,
          'auth'::text AS entity_type,
          l.user_id AS entity_id,
          l.user_id AS actor_id,
          u.email AS actor_email,
          u."fullName" AS actor_name,
          u.role AS actor_role,
          sa.code AS platform_role_code,
          l.email_attempt,
          l.ip,
          NULL::jsonb AS new_value,
          l.reason,
          l.success AS success_flag,
          'auth'::text AS source
        FROM user_login_events l
        LEFT JOIN "User" u ON u.id = l.user_id
        LEFT JOIN user_platform_roles upr ON upr.user_id = l.user_id
        LEFT JOIN platform_roles sa ON sa.id = upr.role_id AND sa.code = 'super_admin'
        ORDER BY l.created_at DESC
        LIMIT ${dbFetchLimit}
      `
    } catch (e) {
      if (!isPostgresUndefinedRelationError(e)) throw e
      loginRows = []
    }

    const merged = [...platformRows, ...loginRows]
      .map((r) => mapRawToEntry(r as unknown as RawUnifiedRow))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    const deduped = dedupeAuthEntries(merged)
    const filtered = deduped.filter((entry) => matchesFilters(entry, filterOpts))
    const total = filtered.length
    const items = filtered.slice(offset, offset + limit)

    return { items, total }
  } catch (e) {
    if (isPostgresUndefinedRelationError(e)) {
      return { items: [], total: 0 }
    }
    throw e
  }
}

/** @deprecated Use listUnifiedAuditLogs */
export async function listAuditLogs(opts: {
  limit?: number
  offset?: number
  entityType?: string
  actorId?: string
}): Promise<{
  items: {
    id: string
    actorId: string | null
    action: string
    entityType: string
    entityId: string | null
    fieldName: string | null
    oldValue: unknown
    newValue: unknown
    ip: string | null
    userAgent: string | null
    createdAt: string
  }[]
  total: number
}> {
  const result = await listUnifiedAuditLogs({
    limit: opts.limit,
    offset: opts.offset,
    action: opts.entityType,
  })
  return {
    total: result.total,
    items: result.items.map((item) => ({
      id: item.id,
      actorId: item.actorId,
      action: item.action,
      entityType: item.entityType,
      entityId: item.entityId,
      fieldName: null,
      oldValue: null,
      newValue: null,
      ip: item.ip,
      userAgent: null,
      createdAt: item.timestamp,
    })),
  }
}
