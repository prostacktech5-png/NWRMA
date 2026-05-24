import { createHmac, timingSafeEqual } from 'crypto'

export type FormResumeEmailTokenPayload = {
  kind: 'form_resume'
  intakeId: string
  formSlug: string
  exp: number
}

/** Issued after the one-time email link is opened; used to submit and reload the wizard. */
export type FormResumeSessionTokenPayload = {
  kind: 'form_resume_session'
  intakeId: string
  formSlug: string
  exp: number
}

export type FormResumeTokenPayload = FormResumeEmailTokenPayload | FormResumeSessionTokenPayload

function resumeSecret(): string {
  const s =
    process.env.FORM_RESUME_SECRET?.trim() ||
    process.env.INVITE_SECRET?.trim()
  if (s && s.length >= 16) return s
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FORM_RESUME_SECRET or INVITE_SECRET must be set (min 16 chars) in production')
  }
  return 'dev-form-resume-secret-change-before-production'
}

export function formResumeExpiryMs(): number {
  const days = Number(process.env.FORM_RESUME_EXPIRY_DAYS ?? '30')
  const d = Number.isFinite(days) && days > 0 ? days : 30
  return d * 24 * 60 * 60 * 1000
}

function signPayload(body: FormResumeTokenPayload): string {
  const encoded = Buffer.from(JSON.stringify(body), 'utf8').toString('base64url')
  const sig = createHmac('sha256', resumeSecret()).update(encoded).digest('base64url')
  return `${encoded}.${sig}`
}

/** One-time link sent by email (Finance approval). */
export function signFormResumeEmailToken(
  payload: Omit<FormResumeEmailTokenPayload, 'kind' | 'exp'>,
  ttlMs: number = formResumeExpiryMs()
): string {
  return signPayload({
    kind: 'form_resume',
    intakeId: payload.intakeId,
    formSlug: payload.formSlug,
    exp: Date.now() + ttlMs,
  })
}

/** @deprecated Use signFormResumeEmailToken */
export function signFormResumeToken(
  payload: Omit<FormResumeEmailTokenPayload, 'kind' | 'exp'>,
  ttlMs: number = formResumeExpiryMs()
): string {
  return signFormResumeEmailToken(payload, ttlMs)
}

/** Continuation token after the email link is redeemed once. */
export function signFormResumeSessionToken(
  payload: Omit<FormResumeSessionTokenPayload, 'kind' | 'exp'>,
  ttlMs: number = formResumeExpiryMs()
): string {
  return signPayload({
    kind: 'form_resume_session',
    intakeId: payload.intakeId,
    formSlug: payload.formSlug,
    exp: Date.now() + ttlMs,
  })
}

export function verifyFormResumeToken(token: string): FormResumeTokenPayload | null {
  const dot = token.lastIndexOf('.')
  if (dot === -1) return null
  const encoded = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = createHmac('sha256', resumeSecret()).update(encoded).digest('base64url')
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }
  try {
    const raw = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as FormResumeTokenPayload
    if (
      (raw.kind !== 'form_resume' && raw.kind !== 'form_resume_session') ||
      typeof raw.intakeId !== 'string' ||
      typeof raw.formSlug !== 'string' ||
      typeof raw.exp !== 'number'
    ) {
      return null
    }
    if (Date.now() > raw.exp) return null
    return raw
  } catch {
    return null
  }
}

export function onlineFormResumeUrl(formSlug: string, rawToken: string): string {
  const raw =
    process.env.PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
  const base = raw.replace(/\/+$/, '') || 'http://localhost:3000'
  return `${base}/online-forms/${encodeURIComponent(formSlug)}?resume=${encodeURIComponent(rawToken)}`
}
