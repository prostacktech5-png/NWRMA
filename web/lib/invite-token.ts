import { createHmac, timingSafeEqual } from 'crypto'

import type { HydroNavAccess } from '@/lib/types'

export type InviteTokenPayload = {
  email: string
  fullName: string
  username: string
  role: string
  department: string | null
  /** Present for new hydrological staff invites — persisted on set-password. */
  hydroNavAccess?: HydroNavAccess | null
  exp: number
}

function inviteSecret(): string {
  const s = process.env.INVITE_SECRET?.trim()
  if (s && s.length >= 16) return s
  if (process.env.NODE_ENV === 'production') {
    throw new Error('INVITE_SECRET must be set (min 16 chars) in production')
  }
  return 'dev-invite-secret-change-before-production'
}

/** Signed token: base64url(payload).hmac */
export function signInvite(payload: Omit<InviteTokenPayload, 'exp'>, ttlMs: number): string {
  const body: InviteTokenPayload = {
    ...payload,
    exp: Date.now() + ttlMs,
  }
  const encoded = Buffer.from(JSON.stringify(body), 'utf8').toString('base64url')
  const sig = createHmac('sha256', inviteSecret()).update(encoded).digest('base64url')
  return `${encoded}.${sig}`
}

export function verifyInviteToken(token: string): InviteTokenPayload | null {
  const dot = token.lastIndexOf('.')
  if (dot === -1) return null
  const encoded = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = createHmac('sha256', inviteSecret()).update(encoded).digest('base64url')
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }
  try {
    const raw = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as InviteTokenPayload
    if (
      typeof raw.email !== 'string' ||
      typeof raw.fullName !== 'string' ||
      typeof raw.username !== 'string' ||
      typeof raw.role !== 'string' ||
      typeof raw.exp !== 'number'
    ) {
      return null
    }
    if (Date.now() > raw.exp) return null
    return {
      email: raw.email,
      fullName: raw.fullName,
      username: raw.username,
      role: raw.role,
      department: raw.department ?? null,
      hydroNavAccess:
        raw.hydroNavAccess != null && typeof raw.hydroNavAccess === 'object' && !Array.isArray(raw.hydroNavAccess)
          ? (raw.hydroNavAccess as HydroNavAccess)
          : null,
      exp: raw.exp,
    }
  } catch {
    return null
  }
}

export function inviteExpiryMs(): number {
  const days = Number(process.env.INVITE_EXPIRY_DAYS ?? '7')
  const d = Number.isFinite(days) && days > 0 ? days : 7
  return d * 24 * 60 * 60 * 1000
}
