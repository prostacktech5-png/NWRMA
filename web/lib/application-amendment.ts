import { createHmac, timingSafeEqual } from 'crypto'
import type { ErpReferencePayload } from '@/lib/erp-reference-types'
import { resolvePublicAppBaseUrl } from '@/lib/form-resume-token'
import { formResumeExpiryMs } from '@/lib/form-resume-token'
import {
  scanDamSafetyCompleteness,
  scanEffluentDischargeCompleteness,
  scanWaterDrillingCompleteness,
  scanWaterRightCompleteness,
} from '@/lib/online-form-readonly-completeness'
import type {
  BoreholeLicenseApplication,
  DamSafetyApplication,
  EffluentDischargeApplication,
  WaterRightApplication,
} from '@/lib/types'

export type ApplicationAmendFormSlug =
  | 'water-drilling-licence'
  | 'dam-safety'
  | 'effluent-discharge'
  | 'water-right'

export type ApplicationAmendTokenPayload = {
  kind: 'application_amend'
  applicationId: string
  formSlug: ApplicationAmendFormSlug
  exp: number
}

export type ApplicationAmendmentFields = {
  amendmentTokenHash?: string | null
  amendmentTokenExpiresAt?: Date | null
  amendmentClearPaths?: string[] | null
}

function amendSecret(): string {
  const s =
    process.env.FORM_RESUME_SECRET?.trim() ||
    process.env.INVITE_SECRET?.trim()
  if (s && s.length >= 16) return s
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FORM_RESUME_SECRET or INVITE_SECRET must be set (min 16 chars) in production')
  }
  return 'dev-form-resume-secret-change-before-production'
}

export function hashAmendmentToken(raw: string): string {
  return createHmac('sha256', amendSecret()).update(raw).digest('hex')
}

function signAmendPayload(body: ApplicationAmendTokenPayload): string {
  const encoded = Buffer.from(JSON.stringify(body), 'utf8').toString('base64url')
  const sig = createHmac('sha256', amendSecret()).update(encoded).digest('base64url')
  return `${encoded}.${sig}`
}

export function signApplicationAmendToken(
  payload: Omit<ApplicationAmendTokenPayload, 'kind' | 'exp'>,
  ttlMs: number = formResumeExpiryMs()
): string {
  return signAmendPayload({
    kind: 'application_amend',
    applicationId: payload.applicationId,
    formSlug: payload.formSlug,
    exp: Date.now() + ttlMs,
  })
}

export function verifyApplicationAmendToken(token: string): ApplicationAmendTokenPayload | null {
  const dot = token.lastIndexOf('.')
  if (dot === -1) return null
  const encoded = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = createHmac('sha256', amendSecret()).update(encoded).digest('base64url')
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
    ) as ApplicationAmendTokenPayload
    if (
      raw.kind !== 'application_amend' ||
      typeof raw.applicationId !== 'string' ||
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

export function onlineFormAmendUrl(formSlug: ApplicationAmendFormSlug, rawToken: string): string {
  const base = resolvePublicAppBaseUrl()
  return `${base}/online-forms/${encodeURIComponent(formSlug)}?amend=${encodeURIComponent(rawToken)}`
}

/** JSON-path style keys (e.g. boreholeClassA[0].qtyAvailable) — not human labels. */
export function isClearableFormPath(path: string): boolean {
  const p = path.trim()
  if (!p || p.startsWith('documents.')) return false
  if (p.includes('[') || p.includes('.')) return true
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(p)
}

export function clearValuesAtPaths<T extends object>(form: T, paths: string[]): T {
  const clone = structuredClone(form) as Record<string, unknown>
  for (const path of paths) {
    if (!isClearableFormPath(path)) continue
    setPathValue(clone, path, emptyValueForPath(clone, path))
  }
  return clone as T
}

function setPathValue(root: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean)
  let cur: Record<string, unknown> | unknown[] = root
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]
    const nextKey = parts[i + 1]
    if (Array.isArray(cur)) {
      const idx = Number(key)
      if (!cur[idx] || typeof cur[idx] !== 'object') {
        cur[idx] = /^\d+$/.test(nextKey) ? [] : {}
      }
      cur = cur[idx] as Record<string, unknown> | unknown[]
    } else {
      const rec = cur as Record<string, unknown>
      if (!rec[key] || typeof rec[key] !== 'object') {
        rec[key] = /^\d+$/.test(nextKey) ? [] : {}
      }
      cur = rec[key] as Record<string, unknown> | unknown[]
    }
  }
  const last = parts[parts.length - 1]
  if (Array.isArray(cur)) {
    cur[Number(last)] = value
  } else {
    ;(cur as Record<string, unknown>)[last] = value
  }
}

function emptyValueForPath(root: Record<string, unknown>, path: string): unknown {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean)
  let cur: unknown = root
  for (const part of parts) {
    if (cur == null) return ''
    if (Array.isArray(cur)) cur = cur[Number(part)]
    else if (typeof cur === 'object') cur = (cur as Record<string, unknown>)[part]
    else break
  }
  if (typeof cur === 'number') return 0
  if (typeof cur === 'boolean') return false
  return ''
}

export function computeAmendClearPaths(
  formSlug: ApplicationAmendFormSlug,
  application:
    | BoreholeLicenseApplication
    | DamSafetyApplication
    | EffluentDischargeApplication
    | WaterRightApplication
): string[] {
  let issues: { path: string; kind: string }[] = []
  switch (formSlug) {
    case 'water-drilling-licence':
      issues = scanWaterDrillingCompleteness(application as BoreholeLicenseApplication).issues
      break
    case 'dam-safety':
      issues = scanDamSafetyCompleteness(application as DamSafetyApplication).issues
      break
    case 'effluent-discharge':
      issues = scanEffluentDischargeCompleteness(application as EffluentDischargeApplication).issues
      break
    case 'water-right':
      issues = scanWaterRightCompleteness(application as WaterRightApplication).issues
      break
    default:
      return []
  }
  return [
    ...new Set(
      issues
        .filter(
          (i) =>
            i.kind === 'empty_field' ||
            i.kind === 'empty_table_cell' ||
            i.kind === 'checklist'
        )
        .map((i) => i.path)
        .filter(isClearableFormPath)
    ),
  ]
}

export type FoundApplication =
  | { formSlug: 'water-drilling-licence'; application: BoreholeLicenseApplication }
  | { formSlug: 'dam-safety'; application: DamSafetyApplication }
  | { formSlug: 'effluent-discharge'; application: EffluentDischargeApplication }
  | { formSlug: 'water-right'; application: WaterRightApplication }

export function findApplicationInPayload(
  payload: ErpReferencePayload,
  formSlug: ApplicationAmendFormSlug,
  applicationId: string
): FoundApplication | null {
  switch (formSlug) {
    case 'water-drilling-licence': {
      const application = (payload.licenseApplications ?? []).find((a) => a.id === applicationId)
      return application ? { formSlug, application } : null
    }
    case 'dam-safety': {
      const application = (payload.damSafetyApplications ?? []).find((a) => a.id === applicationId)
      return application ? { formSlug, application } : null
    }
    case 'effluent-discharge': {
      const application = (payload.effluentDischargeApplications ?? []).find(
        (a) => a.id === applicationId
      )
      return application ? { formSlug, application } : null
    }
    case 'water-right': {
      const application = (payload.waterRightApplications ?? []).find((a) => a.id === applicationId)
      return application ? { formSlug, application } : null
    }
    default:
      return null
  }
}

export function issueApplicationAmendment(
  formSlug: ApplicationAmendFormSlug,
  applicationId: string,
  application:
    | BoreholeLicenseApplication
    | DamSafetyApplication
    | EffluentDischargeApplication
    | WaterRightApplication
): {
  rawToken: string
  hash: string
  expiresAt: Date
  clearPaths: string[]
} {
  const rawToken = signApplicationAmendToken({ applicationId, formSlug })
  const clearPaths = computeAmendClearPaths(formSlug, application)
  return {
    rawToken,
    hash: hashAmendmentToken(rawToken),
    expiresAt: new Date(Date.now() + formResumeExpiryMs()),
    clearPaths,
  }
}

export function additionalInfoRequestPayload(
  formSlug: ApplicationAmendFormSlug,
  applicationId: string,
  application:
    | BoreholeLicenseApplication
    | DamSafetyApplication
    | EffluentDischargeApplication
    | WaterRightApplication,
  reviewNote: string
): {
  patch: ApplicationAmendmentFields & {
    status: 'additional_info_required'
    reviewNote: string
    reviewedAt: Date
  }
  amendUrl: string
} {
  const issued = issueApplicationAmendment(formSlug, applicationId, application)
  return {
    patch: {
      status: 'additional_info_required',
      reviewNote: reviewNote.trim(),
      reviewedAt: new Date(),
      amendmentTokenHash: issued.hash,
      amendmentTokenExpiresAt: issued.expiresAt,
      amendmentClearPaths: issued.clearPaths,
    },
    amendUrl: onlineFormAmendUrl(formSlug, issued.rawToken),
  }
}

export function verifyApplicationAmendmentAccess(
  app: ApplicationAmendmentFields & { status: string },
  rawToken: string
): { ok: true } | { ok: false; error: string } {
  const payload = verifyApplicationAmendToken(rawToken)
  if (!payload) return { ok: false, error: 'Invalid or expired amendment link.' }
  if (app.status !== 'additional_info_required') {
    return { ok: false, error: 'This application is not awaiting additional information.' }
  }
  if (!app.amendmentTokenHash) {
    return { ok: false, error: 'No active amendment link for this application.' }
  }
  if (hashAmendmentToken(rawToken) !== app.amendmentTokenHash) {
    return { ok: false, error: 'Amendment link is no longer valid.' }
  }
  if (app.amendmentTokenExpiresAt && new Date() > new Date(app.amendmentTokenExpiresAt)) {
    return { ok: false, error: 'Amendment link has expired.' }
  }
  return { ok: true }
}
