import { SESSION_COOKIE } from '@/lib/super-admin/session-constants'
import { resolveSessionUserId } from '@/lib/super-admin/session'

/** Acting user id: httpOnly session cookie from `POST /api/auth/login`, or `X-Acting-User-Id` for API tools. */
export const DEMO_ACTING_USER_COOKIE = 'nwrma_acting_user_id'

function parseCookieHeader(header: string | null): Record<string, string> {
  if (!header) return {}
  const out: Record<string, string> = {}
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const k = part.slice(0, idx).trim()
    const v = part.slice(idx + 1).trim()
    try {
      if (k) out[k] = decodeURIComponent(v)
    } catch {
      if (k) out[k] = v
    }
  }
  return out
}

/** Prefer signed session cookie; legacy acting-user id; header only in non-production. */
export function readActingUserIdFromRequest(req: Request): string | null {
  const cookies = parseCookieHeader(req.headers.get('cookie'))
  const legacy = cookies[DEMO_ACTING_USER_COOKIE]?.trim()
  if (legacy) return legacy

  if (process.env.NODE_ENV !== 'production') {
    const fromHeader = req.headers.get('x-acting-user-id')?.trim()
    if (fromHeader) return fromHeader
  }
  return null
}

export function readSessionCookieFromRequest(req: Request): string | null {
  return parseCookieHeader(req.headers.get('cookie'))[SESSION_COOKIE]?.trim() || null
}

/** Resolve user id from signed session, then legacy cookie / dev header. */
export async function resolveActingUserIdFromRequest(req: Request): Promise<string | null> {
  const signed = readSessionCookieFromRequest(req)
  if (signed) {
    const fromSession = await resolveSessionUserId(signed)
    if (fromSession) return fromSession
  }
  return readActingUserIdFromRequest(req)
}
