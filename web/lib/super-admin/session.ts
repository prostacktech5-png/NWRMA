import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'crypto'
import { getSql, isPostgresUndefinedRelationError } from '@/lib/db'

import { SESSION_COOKIE } from '@/lib/super-admin/session-constants'
const SESSION_DAYS = 7

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim() || process.env.INVITE_TOKEN_SECRET?.trim()
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET is required in production')
    }
    return 'dev-session-secret-change-in-production'
  }
  return secret
}

export function hashSessionToken(token: string): string {
  return createHmac('sha256', sessionSecret()).update(token).digest('hex')
}

export function signSessionPayload(sessionId: string, token: string): string {
  const payload = `${sessionId}.${token}`
  const sig = createHmac('sha256', sessionSecret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verifySignedSession(value: string): { sessionId: string; token: string } | null {
  const parts = value.split('.')
  if (parts.length !== 3) return null
  const [sessionId, token, sig] = parts
  const expected = createHmac('sha256', sessionSecret())
    .update(`${sessionId}.${token}`)
    .digest('base64url')
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  } catch {
    return null
  }
  return { sessionId, token }
}

export async function createUserSession(
  userId: string,
  meta: { ip?: string | null; userAgent?: string | null }
): Promise<{ sessionId: string; signedCookie: string }> {
  const sql = getSql()
  const sessionId = randomUUID()
  const token = randomBytes(32).toString('base64url')
  const tokenHash = hashSessionToken(token)
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await sql`
    INSERT INTO user_sessions (id, user_id, token_hash, ip, user_agent, expires_at)
    VALUES (${sessionId}, ${userId}, ${tokenHash}, ${meta.ip ?? null}, ${meta.userAgent ?? null}, ${expiresAt})
  `
  return { sessionId, signedCookie: signSessionPayload(sessionId, token) }
}

export async function resolveSessionUserId(signedValue: string): Promise<string | null> {
  const parsed = verifySignedSession(signedValue)
  if (!parsed) return null
  try {
    const sql = getSql()
    const tokenHash = hashSessionToken(parsed.token)
    const rows = await sql`
      SELECT user_id FROM user_sessions
      WHERE id = ${parsed.sessionId}
        AND token_hash = ${tokenHash}
        AND revoked_at IS NULL
        AND expires_at > now()
    `
    const row = rows[0] as { user_id: string } | undefined
    return row ? String(row.user_id) : null
  } catch (e) {
    if (isPostgresUndefinedRelationError(e)) return null
    throw e
  }
}

export async function revokeSession(sessionId: string): Promise<void> {
  const sql = getSql()
  await sql`UPDATE user_sessions SET revoked_at = now() WHERE id = ${sessionId}`
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  const sql = getSql()
  await sql`UPDATE user_sessions SET revoked_at = now() WHERE user_id = ${userId} AND revoked_at IS NULL`
}

export async function listUserSessions(userId: string) {
  const sql = getSql()
  const rows = await sql`
    SELECT id, ip, user_agent, created_at, expires_at, revoked_at
    FROM user_sessions
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 50
  `
  return rows.map((r) => {
    const row = r as Record<string, unknown>
    return {
      id: String(row.id),
      ip: row.ip != null ? String(row.ip) : null,
      userAgent: row.user_agent != null ? String(row.user_agent) : null,
      createdAt: new Date(String(row.created_at)).toISOString(),
      expiresAt: new Date(String(row.expires_at)).toISOString(),
      revokedAt: row.revoked_at ? new Date(String(row.revoked_at)).toISOString() : null,
    }
  })
}

export { SESSION_COOKIE } from '@/lib/super-admin/session-constants'
