import { NextResponse } from 'next/server'
import { DEMO_ACTING_USER_COOKIE } from '@/lib/demo-acting-user'
import { SESSION_COOKIE } from '@/lib/super-admin/session-constants'

/** HttpOnly cookie holding JWT from NWRMA Express when that login path is used. */
export const NWRMA_ACCESS_TOKEN_COOKIE = 'nwrma_access_token'

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 400

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

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: COOKIE_MAX_AGE_SEC,
  }
}

export type SessionCookiePayload = {
  userId: string
  accessToken?: string | null
  signedSession?: string | null
}

export function applySessionToResponse(res: NextResponse, p: SessionCookiePayload): void {
  const opts = baseCookieOptions()
  res.cookies.set(DEMO_ACTING_USER_COOKIE, p.userId.trim(), opts)
  const signed = p.signedSession?.trim()
  if (signed) {
    res.cookies.set(SESSION_COOKIE, signed, opts)
  }
  const t = p.accessToken?.trim()
  if (t) {
    res.cookies.set(NWRMA_ACCESS_TOKEN_COOKIE, t, opts)
  } else {
    res.cookies.delete(NWRMA_ACCESS_TOKEN_COOKIE)
  }
}

export function clearSessionOnResponse(res: NextResponse): void {
  res.cookies.delete(DEMO_ACTING_USER_COOKIE)
  res.cookies.delete(NWRMA_ACCESS_TOKEN_COOKIE)
  res.cookies.delete(SESSION_COOKIE)
}

export function readNwrmaAccessTokenFromRequest(req: Request): string | null {
  const raw = parseCookieHeader(req.headers.get('cookie'))[NWRMA_ACCESS_TOKEN_COOKIE]
  const v = raw?.trim()
  return v || null
}
