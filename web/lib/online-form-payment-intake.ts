import type { ErpReferencePayload } from '@/lib/erp-reference-types'
import {
  formResumeExpiryMs,
  signFormResumeEmailToken,
  signFormResumeSessionToken,
  verifyFormResumeToken,
} from '@/lib/form-resume-token'
import { apuReviewHref, isOnlineFormSlug } from '@/lib/hydrological-application-processing'

export { isOnlineFormSlug }
import { getOnlineForm } from '@/lib/nwrma-site/online-forms/registry'
import type { ApplicantGateFields } from '@/lib/nwrma-site/online-forms/applicant-gate'
import {
  hashResumeToken,
  readPaymentIntakeReceipt,
} from '@/lib/online-form-payment-intake-file-store'
import type {
  BankReceiptValidation,
  BankReceiptValidationStatus,
  OnlineFormPaymentIntake,
  OnlineFormPaymentIntakeAcknowledgements,
} from '@/lib/types'

export type PaymentIntakeQueueItem = {
  intakeId: string
  intakeReference: string
  formSlug: string
  formLabel: string
  organisationName: string
  email: string
  phone: string
  contactPersonName: string
  submittedAt: string
  validationStatus: BankReceiptValidationStatus
  validation: BankReceiptValidation
  receiptFile: { id: string; name: string; mimeType?: string }
  linkedApplicationId: string | null
  documentApiPath: string
  reviewHref: string | null
}

let intakeSeq = 0

export function newPaymentIntakeId(): string {
  intakeSeq += 1
  return `pfi-${Date.now()}-${intakeSeq}`
}

export function nextPaymentIntakeReference(existing: OnlineFormPaymentIntake[]): string {
  const year = new Date().getFullYear()
  const prefix = `PFI-${year}-`
  const nums = existing
    .map((i) => i.intakeReference)
    .filter((r) => r.startsWith(prefix))
    .map((r) => parseInt(r.slice(prefix.length), 10))
    .filter((n) => Number.isFinite(n))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `${prefix}${String(next).padStart(4, '0')}`
}

/** Official finance receipt number issued when a bank slip is marked validated. */
export function nextFinanceReceiptNumber(existing: OnlineFormPaymentIntake[]): string {
  const year = new Date().getFullYear()
  const prefix = `RCP-${year}-`
  const nums = existing
    .map((i) => i.bankReceiptValidation?.receiptNumber)
    .filter((r): r is string => typeof r === 'string' && r.startsWith(prefix))
    .map((r) => parseInt(r.slice(prefix.length), 10))
    .filter((n) => Number.isFinite(n))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `${prefix}${String(next).padStart(4, '0')}`
}

export function financeReceiptVerifiedDate(
  validation: BankReceiptValidation | undefined
): string | null {
  const at = validation?.validatedAt
  if (!at) return null
  const d = at instanceof Date ? at : new Date(at)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

export function findPaymentIntake(
  payload: ErpReferencePayload,
  intakeId: string
): OnlineFormPaymentIntake | undefined {
  return (payload.onlineFormPaymentIntakes ?? []).find((i) => i.id === intakeId)
}

export function getIntakeValidationStatus(
  validation: BankReceiptValidation | undefined
): BankReceiptValidationStatus {
  return validation?.status ?? 'pending'
}

export function intakeToQueueItem(intake: OnlineFormPaymentIntake): PaymentIntakeQueueItem {
  const reviewHref = intake.linkedApplicationId
    ? reviewHrefForLinked(intake.formSlug, intake.linkedApplicationId)
    : null
  return {
    intakeId: intake.id,
    intakeReference: intake.intakeReference,
    formSlug: intake.formSlug,
    formLabel: intake.formTitle,
    organisationName: intake.organisationName,
    email: intake.email,
    phone: intake.phone,
    contactPersonName: intake.contactPersonName,
    submittedAt:
      intake.createdAt instanceof Date
        ? intake.createdAt.toISOString()
        : String(intake.createdAt),
    validationStatus: getIntakeValidationStatus(intake.bankReceiptValidation),
    validation: intake.bankReceiptValidation ?? { status: 'pending' },
    receiptFile: {
      id: intake.receiptFile.id,
      name: intake.receiptFile.name,
      mimeType: intake.receiptFile.mimeType,
    },
    linkedApplicationId: intake.linkedApplicationId ?? null,
    documentApiPath: `/api/public/online-forms/payment-intake/${intake.id}/receipt`,
    reviewHref,
  }
}

function reviewHrefForLinked(formSlug: string, applicationId: string): string {
  if (isOnlineFormSlug(formSlug)) {
    return apuReviewHref(formSlug, applicationId)
  }
  return `/online-forms/${formSlug}`
}

export function buildPaymentIntakeQueue(
  payload: ErpReferencePayload
): PaymentIntakeQueueItem[] {
  const items = (payload.onlineFormPaymentIntakes ?? []).map(intakeToQueueItem)
  return items.sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  )
}

export function paymentIntakeMetrics(items: PaymentIntakeQueueItem[]) {
  return {
    pending: items.filter((i) => i.validationStatus === 'pending').length,
    validated: items.filter((i) => i.validationStatus === 'validated').length,
    rejected: items.filter((i) => i.validationStatus === 'rejected').length,
    total: items.length,
  }
}

export function createPendingIntake(params: {
  formSlug: string
  fields: ApplicantGateFields
  acknowledgements: OnlineFormPaymentIntakeAcknowledgements
  receiptFile: OnlineFormPaymentIntake['receiptFile']
  existing: OnlineFormPaymentIntake[]
  intakeId?: string
}): OnlineFormPaymentIntake {
  const form = getOnlineForm(params.formSlug)
  const id = params.intakeId ?? newPaymentIntakeId()
  return {
    id,
    intakeReference: nextPaymentIntakeReference(params.existing),
    formSlug: params.formSlug,
    formTitle: form?.title ?? params.formSlug,
    organisationName: params.fields.organizationName.trim(),
    email: params.fields.email.trim(),
    phone: params.fields.phone.trim(),
    contactPersonName: params.fields.contactPersonName.trim(),
    acknowledgements: params.acknowledgements,
    receiptFile: params.receiptFile,
    bankReceiptValidation: { status: 'pending' },
    resumeTokenHash: null,
    resumeTokenExpiresAt: null,
    resumeTokenRedeemedAt: null,
    linkedApplicationId: null,
    createdAt: new Date(),
  }
}

export function issueResumeTokenForIntake(intake: OnlineFormPaymentIntake): {
  rawToken: string
  hash: string
  expiresAt: Date
} {
  const rawToken = signFormResumeEmailToken({
    intakeId: intake.id,
    formSlug: intake.formSlug,
  })
  const ttl = formResumeExpiryMs()
  return {
    rawToken,
    hash: hashResumeToken(rawToken),
    expiresAt: new Date(Date.now() + ttl),
  }
}

export function issueSessionTokenForIntake(intake: OnlineFormPaymentIntake): {
  rawToken: string
  hash: string
  expiresAt: Date
} {
  const rawToken = signFormResumeSessionToken({
    intakeId: intake.id,
    formSlug: intake.formSlug,
  })
  const ttl = formResumeExpiryMs()
  return {
    rawToken,
    hash: hashResumeToken(rawToken),
    expiresAt: new Date(Date.now() + ttl),
  }
}

function intakeResumeBaseChecks(
  intake: OnlineFormPaymentIntake,
  payload: NonNullable<ReturnType<typeof verifyFormResumeToken>>
): string | null {
  if (payload.intakeId !== intake.id) return 'Resume link does not match this application.'
  if (payload.formSlug !== intake.formSlug) return 'Resume link is for a different form.'
  if (getIntakeValidationStatus(intake.bankReceiptValidation) !== 'validated') {
    return 'Payment has not been verified yet.'
  }
  if (intake.linkedApplicationId) {
    return 'This payment intake has already been used to submit an application.'
  }
  return null
}

export function verifyIntakeResumeToken(
  intake: OnlineFormPaymentIntake,
  rawToken: string
): { ok: true } | { ok: false; error: string } {
  const payload = verifyFormResumeToken(rawToken)
  if (!payload) return { ok: false, error: 'Invalid or expired resume link.' }
  const baseErr = intakeResumeBaseChecks(intake, payload)
  if (baseErr) return { ok: false, error: baseErr }
  if (!intake.resumeTokenHash) return { ok: false, error: 'No active resume link for this intake.' }
  if (hashResumeToken(rawToken) !== intake.resumeTokenHash) {
    return { ok: false, error: 'Resume link is no longer valid.' }
  }
  if (intake.resumeTokenExpiresAt && new Date() > new Date(intake.resumeTokenExpiresAt)) {
    return { ok: false, error: 'Resume link has expired.' }
  }
  return { ok: true }
}

/** Check resume token for status preview (GET must not consume one-time email links). */
export function previewIntakeResumeToken(
  intake: OnlineFormPaymentIntake,
  rawToken: string
):
  | { ok: true; mode: 'session_active' }
  | { ok: true; mode: 'email_redeem' }
  | { ok: true; mode: 'email_reissue' }
  | { ok: false; error: string } {
  const payload = verifyFormResumeToken(rawToken)
  if (!payload) return { ok: false, error: 'Invalid or expired resume link.' }
  const baseErr = intakeResumeBaseChecks(intake, payload)
  if (baseErr) return { ok: false, error: baseErr }

  if (payload.kind === 'form_resume_session') {
    const check = verifyIntakeResumeToken(intake, rawToken)
    return check.ok ? { ok: true, mode: 'session_active' } : { ok: false, error: check.error }
  }

  if (!intake.resumeTokenHash) {
    return { ok: false, error: 'No active resume link for this intake.' }
  }

  if (intake.resumeTokenRedeemedAt) {
    return { ok: true, mode: 'email_reissue' }
  }

  if (hashResumeToken(rawToken) !== intake.resumeTokenHash) {
    return { ok: false, error: 'Resume link is no longer valid.' }
  }
  if (intake.resumeTokenExpiresAt && new Date() > new Date(intake.resumeTokenExpiresAt)) {
    return { ok: false, error: 'Resume link has expired.' }
  }

  return { ok: true, mode: 'email_redeem' }
}

function issueIntakeSession(
  payload: ErpReferencePayload,
  intake: OnlineFormPaymentIntake,
  markEmailRedeemed: boolean
): { payload: ErpReferencePayload; sessionToken: string } {
  const session = issueSessionTokenForIntake(intake)
  const next = patchIntakeInPayload(payload, intake.id, {
    resumeTokenHash: session.hash,
    resumeTokenExpiresAt: session.expiresAt,
    ...(markEmailRedeemed && !intake.resumeTokenRedeemedAt
      ? { resumeTokenRedeemedAt: new Date() }
      : {}),
  })
  return { payload: next, sessionToken: session.rawToken }
}

/** Redeem the one-time email link (POST only); returns a session token for continuing the wizard. */
export function redeemPaymentIntakeResumeLink(
  payload: ErpReferencePayload,
  intake: OnlineFormPaymentIntake,
  rawEmailToken: string
): { payload: ErpReferencePayload; sessionToken: string } | { error: string } {
  const preview = previewIntakeResumeToken(intake, rawEmailToken)
  if (!preview.ok) return { error: preview.error }

  if (preview.mode === 'session_active') {
    return { payload, sessionToken: rawEmailToken }
  }

  if (preview.mode === 'email_reissue') {
    return issueIntakeSession(payload, intake, false)
  }

  const tokenPayload = verifyFormResumeToken(rawEmailToken)
  if (!tokenPayload || tokenPayload.kind !== 'form_resume') {
    return { error: 'Invalid or expired resume link.' }
  }

  return issueIntakeSession(payload, intake, true)
}

export function assertIntakeReadyForApplicationSubmit(
  intake: OnlineFormPaymentIntake,
  formSlug: string,
  rawToken: string
): string | null {
  if (intake.formSlug !== formSlug) return 'Intake is for a different form.'
  const v = verifyIntakeResumeToken(intake, rawToken)
  if (!v.ok) return v.error
  return null
}

/** Prevent tampering with org/email after payment verification. */
export function assertApplicationMatchesIntakeIdentity(
  intake: OnlineFormPaymentIntake,
  companyName: string,
  email: string
): string | null {
  const norm = (s: string) => s.trim().toLowerCase()
  if (norm(companyName) !== norm(intake.organisationName)) {
    return 'Organization name must match your verified payment record.'
  }
  if (norm(email) !== norm(intake.email)) {
    return 'Email must match your verified payment record.'
  }
  return null
}

export function patchIntakeInPayload(
  payload: ErpReferencePayload,
  intakeId: string,
  patch: Partial<OnlineFormPaymentIntake>
): ErpReferencePayload {
  return {
    ...payload,
    onlineFormPaymentIntakes: (payload.onlineFormPaymentIntakes ?? []).map((i) =>
      i.id === intakeId ? { ...i, ...patch } : i
    ),
  }
}

export async function copyIntakeReceiptBuffer(
  intake: OnlineFormPaymentIntake
): Promise<{ buffer: Buffer; mimeType: string; name: string } | null> {
  if (!intake.receiptFile.storageKey) return null
  const { buffer, mimeType } = await readPaymentIntakeReceipt(intake.receiptFile.storageKey)
  return { buffer, mimeType, name: intake.receiptFile.name }
}

export type IntakeStatusResponse = {
  intakeId: string
  intakeReference: string
  formSlug: string
  formTitle: string
  status: BankReceiptValidationStatus
  organisationName: string
  email: string
  phone: string
  contactPersonName: string
  validationNote: string | null
  /** Official receipt number (RCP-YYYY-####) when validated. */
  financeReceiptNumber: string | null
  feeVerifiedDate: string | null
  canContinue: boolean
  /** Payment intake was consumed (e.g. linked to an approved application) — start a new receipt upload. */
  requiresNewPayment?: boolean
  paymentBlockedMessage?: string | null
  linkedApplicationReference?: string | null
  linkedApplicationStatus?: string | null
  /** User must POST /redeem (avoids email link prefetch consuming the token). */
  needsRedeem?: boolean
  /** Returned when the email link is redeemed via POST. */
  sessionToken?: string
  error?: string
}

export function intakeToStatusResponse(
  intake: OnlineFormPaymentIntake,
  canContinue: boolean,
  extras?: Pick<
    IntakeStatusResponse,
  | 'requiresNewPayment'
  | 'paymentBlockedMessage'
  | 'linkedApplicationReference'
  | 'linkedApplicationStatus'
  >
): IntakeStatusResponse {
  const status = getIntakeValidationStatus(intake.bankReceiptValidation)
  return {
    intakeId: intake.id,
    intakeReference: intake.intakeReference,
    formSlug: intake.formSlug,
    formTitle: intake.formTitle,
    status,
    organisationName: intake.organisationName,
    email: intake.email,
    phone: intake.phone,
    contactPersonName: intake.contactPersonName,
    validationNote: intake.bankReceiptValidation?.note ?? null,
    financeReceiptNumber: intake.bankReceiptValidation?.receiptNumber ?? null,
    feeVerifiedDate: financeReceiptVerifiedDate(intake.bankReceiptValidation),
    canContinue,
    ...extras,
  }
}
