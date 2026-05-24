import { randomUUID } from 'crypto'
import { getSql, isPostgresUndefinedRelationError } from '@/lib/db'

export async function recordLoginEvent(input: {
  userId?: string | null
  emailAttempt: string
  success: boolean
  ip?: string | null
  userAgent?: string | null
  reason?: string | null
}): Promise<void> {
  try {
    const sql = getSql()
    await sql`
      INSERT INTO user_login_events (id, user_id, email_attempt, success, ip, user_agent, reason)
      VALUES (
        ${randomUUID()},
        ${input.userId ?? null},
        ${input.emailAttempt},
        ${input.success},
        ${input.ip ?? null},
        ${input.userAgent ?? null},
        ${input.reason ?? null}
      )
    `
  } catch (e) {
    if (isPostgresUndefinedRelationError(e)) return
    throw e
  }
}

export async function incrementFailedLogin(userId: string): Promise<number> {
  try {
    const sql = getSql()
    const rows = await sql`
      UPDATE "User"
      SET failed_login_count = failed_login_count + 1,
          locked_until = CASE
            WHEN failed_login_count + 1 >= 5 THEN now() + interval '30 minutes'
            ELSE locked_until
          END
      WHERE id = ${userId}
      RETURNING failed_login_count
    `
    return Number((rows[0] as { failed_login_count: number })?.failed_login_count ?? 0)
  } catch {
    return 0
  }
}

export async function resetFailedLogin(userId: string): Promise<void> {
  try {
    const sql = getSql()
    await sql`
      UPDATE "User" SET failed_login_count = 0, locked_until = NULL WHERE id = ${userId}
    `
  } catch {
    /* optional columns */
  }
}

export async function getUserLoginLock(userId: string): Promise<{
  lockedUntil: Date | null
  failedCount: number
  status: string
}> {
  try {
    const sql = getSql()
    const rows = await sql`
      SELECT locked_until, failed_login_count, status FROM "User" WHERE id = ${userId}
    `
    const row = rows[0] as Record<string, unknown> | undefined
    if (!row) return { lockedUntil: null, failedCount: 0, status: 'active' }
    return {
      lockedUntil: row.locked_until ? new Date(String(row.locked_until)) : null,
      failedCount: Number(row.failed_login_count ?? 0),
      status: String(row.status ?? 'active'),
    }
  } catch {
    return { lockedUntil: null, failedCount: 0, status: 'active' }
  }
}

export async function listLoginEvents(userId: string, limit = 50) {
  try {
    const sql = getSql()
    const rows = await sql`
      SELECT id, success, ip, user_agent, reason, created_at
      FROM user_login_events
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `
    return rows.map((r) => {
      const row = r as Record<string, unknown>
      return {
        id: String(row.id),
        success: Boolean(row.success),
        ip: row.ip != null ? String(row.ip) : null,
        userAgent: row.user_agent != null ? String(row.user_agent) : null,
        reason: row.reason != null ? String(row.reason) : null,
        createdAt: new Date(String(row.created_at)).toISOString(),
      }
    })
  } catch (e) {
    if (isPostgresUndefinedRelationError(e)) return []
    throw e
  }
}
