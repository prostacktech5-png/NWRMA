import { getSql } from '@/lib/db'
import { ensureHrSchema } from '@/lib/db/hr-schema'
import { appendHrAuditLog } from '@/lib/hr-audit-log'
import type { HrSubscription, HrSubscriptionStatus, HrSubscriptionType } from '@/lib/hr-types'

function rowToSubscription(r: Record<string, unknown>): HrSubscription {
  return {
    id: String(r.id),
    name: String(r.name),
    subscriptionType: String(r.subscription_type ?? 'software') as HrSubscriptionType,
    vendor: String(r.vendor ?? ''),
    accountRef: String(r.account_ref ?? ''),
    cost: r.cost != null ? Number(r.cost) : null,
    currency: String(r.currency ?? 'SLE'),
    expiresAt: new Date(String(r.expires_at)),
    status: String(r.status ?? 'active') as HrSubscriptionStatus,
    reminderDays: Number(r.reminder_days ?? 30),
    lastReminderAt: r.last_reminder_at != null ? new Date(String(r.last_reminder_at)) : null,
    notes: String(r.notes ?? ''),
    createdAt: new Date(String(r.created_at)),
    updatedAt: new Date(String(r.updated_at)),
  }
}

export function hrSubscriptionToJson(s: HrSubscription) {
  return {
    ...s,
    expiresAt: s.expiresAt.toISOString().slice(0, 10),
    lastReminderAt: s.lastReminderAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    daysUntilExpiry: Math.ceil(
      (s.expiresAt.getTime() - Date.now()) / 86_400_000
    ),
  }
}

export async function listHrSubscriptions(opts?: {
  status?: HrSubscriptionStatus
  expiringWithinDays?: number
}): Promise<HrSubscription[]> {
  await ensureHrSchema()
  const sql = getSql()
  const rows = await sql`SELECT * FROM hr_subscriptions ORDER BY expires_at ASC`
  let list = (rows as Record<string, unknown>[]).map(rowToSubscription)
  if (opts?.status) list = list.filter((s) => s.status === opts.status)
  if (opts?.expiringWithinDays != null) {
    const max = opts.expiringWithinDays
    const now = Date.now()
    list = list.filter((s) => {
      if (s.status !== 'active') return false
      const days = (s.expiresAt.getTime() - now) / 86_400_000
      return days >= 0 && days <= max
    })
  }
  return list
}

export async function getHrSubscriptionById(id: string): Promise<HrSubscription | null> {
  await ensureHrSchema()
  const sql = getSql()
  const rows = await sql`SELECT * FROM hr_subscriptions WHERE id = ${id}`
  const row = (rows as Record<string, unknown>[])[0]
  return row ? rowToSubscription(row) : null
}

export async function createHrSubscription(
  input: {
    name: string
    subscriptionType: HrSubscriptionType
    vendor?: string
    accountRef?: string
    cost?: number | null
    currency?: string
    expiresAt: string
    reminderDays?: number
    notes?: string
  },
  actorUserId: string | null
): Promise<HrSubscription> {
  await ensureHrSchema()
  const sql = getSql()
  const id = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const now = new Date().toISOString()
  await sql`
    INSERT INTO hr_subscriptions (
      id, name, subscription_type, vendor, account_ref, cost, currency,
      expires_at, status, reminder_days, notes, created_at, updated_at
    ) VALUES (
      ${id}, ${input.name}, ${input.subscriptionType}, ${input.vendor ?? ''},
      ${input.accountRef ?? ''}, ${input.cost ?? null}, ${input.currency ?? 'SLE'},
      ${input.expiresAt}, 'active', ${input.reminderDays ?? 30},
      ${input.notes ?? ''}, ${now}, ${now}
    )
  `
  await appendHrAuditLog({
    entityType: 'hr_subscription',
    entityId: id,
    action: 'create',
    actorUserId,
  })
  return (await getHrSubscriptionById(id))!
}

export async function updateHrSubscription(
  id: string,
  patch: Partial<{
    name: string
    subscriptionType: HrSubscriptionType
    vendor: string
    accountRef: string
    cost: number | null
    currency: string
    expiresAt: string
    status: HrSubscriptionStatus
    reminderDays: number
    notes: string
  }>,
  actorUserId: string | null
): Promise<HrSubscription | null> {
  const existing = await getHrSubscriptionById(id)
  if (!existing) return null
  await ensureHrSchema()
  const sql = getSql()
  const now = new Date().toISOString()
  await sql`
    UPDATE hr_subscriptions SET
      name = ${patch.name ?? existing.name},
      subscription_type = ${patch.subscriptionType ?? existing.subscriptionType},
      vendor = ${patch.vendor ?? existing.vendor},
      account_ref = ${patch.accountRef ?? existing.accountRef},
      cost = ${patch.cost !== undefined ? patch.cost : existing.cost},
      currency = ${patch.currency ?? existing.currency},
      expires_at = ${
        patch.expiresAt ?? existing.expiresAt.toISOString().slice(0, 10)
      },
      status = ${patch.status ?? existing.status},
      reminder_days = ${patch.reminderDays ?? existing.reminderDays},
      notes = ${patch.notes ?? existing.notes},
      updated_at = ${now}
    WHERE id = ${id}
  `
  await appendHrAuditLog({
    entityType: 'hr_subscription',
    entityId: id,
    action: 'update',
    actorUserId,
  })
  return getHrSubscriptionById(id)
}

export async function markSubscriptionRenewed(
  id: string,
  newExpiresAt: string,
  actorUserId: string | null
): Promise<HrSubscription | null> {
  const existing = await getHrSubscriptionById(id)
  if (!existing) return null
  await ensureHrSchema()
  const sql = getSql()
  const now = new Date().toISOString()
  await sql`
    UPDATE hr_subscriptions SET
      expires_at = ${newExpiresAt},
      status = 'active',
      last_reminder_at = NULL,
      updated_at = ${now}
    WHERE id = ${id}
  `
  await appendHrAuditLog({
    entityType: 'hr_subscription',
    entityId: id,
    action: 'renew',
    actorUserId,
    payload: { newExpiresAt },
  })
  return getHrSubscriptionById(id)
}

export async function recordSubscriptionReminder(id: string): Promise<void> {
  await ensureHrSchema()
  const sql = getSql()
  const now = new Date().toISOString()
  await sql`UPDATE hr_subscriptions SET last_reminder_at = ${now}, updated_at = ${now} WHERE id = ${id}`
}

export async function archiveHrSubscription(
  id: string,
  actorUserId: string | null
): Promise<HrSubscription | null> {
  return updateHrSubscription(id, { status: 'cancelled' }, actorUserId)
}

export function countExpiringSubscriptions(
  subs: HrSubscription[],
  withinDays: number
): number {
  const now = Date.now()
  return subs.filter((s) => {
    if (s.status !== 'active') return false
    const days = (s.expiresAt.getTime() - now) / 86_400_000
    return days >= 0 && days <= withinDays
  }).length
}
