'use client'

import Link from 'next/link'
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react'

export function PaymentIntakeVerifiedEmailPanel({
  intakeReference,
  email,
  financeReceiptNumber,
}: {
  intakeReference: string
  email: string
  financeReceiptNumber?: string | null
}) {
  const emailOnFile = email.trim()
  const receipt = financeReceiptNumber?.trim() ?? ''
  return (
    <div className="nwrma-form-intake-status nwrma-form-intake-status--validated">
      <CheckCircle2 className="nwrma-form-intake-status__icon" aria-hidden />
      <h2 className="nwrma-form-intake-status__title">Payment verified — check your email</h2>
      <p className="nwrma-form-intake-status__text">
        NWRMA Finance has verified your administrative fee payment. We sent a personal link to
        continue your application.
      </p>
      <p className="nwrma-form-intake-status__meta">
        <strong>Reference:</strong> {intakeReference}
        <br />
        <strong>Email on file:</strong> {emailOnFile || '—'}
        {receipt ? (
          <>
            <br />
            <strong>Official receipt number:</strong> {receipt}
          </>
        ) : null}
      </p>
      <p className="nwrma-form-intake-status__hint">
        Open the message titled &quot;Payment verified — continue your application&quot; and click
        <strong> Continue application</strong>. The link works once; if it expired, contact NWRMA
        Finance. This page updates if you return from that email on this device.
      </p>
    </div>
  )
}

export function PaymentIntakeWaitingPanel({
  intakeReference,
  email,
}: {
  intakeReference: string
  email: string
}) {
  const emailOnFile = email.trim()
  return (
    <div className="nwrma-form-intake-status nwrma-form-intake-status--pending">
      <Clock className="nwrma-form-intake-status__icon" aria-hidden />
      <h2 className="nwrma-form-intake-status__title">Payment verification in progress</h2>
      <p className="nwrma-form-intake-status__text">
        Thank you. Your bank receipt and contact details have been submitted for review by NWRMA
        Finance.
      </p>
      <p className="nwrma-form-intake-status__meta">
        <strong>Reference:</strong> {intakeReference}
        <br />
        <strong>Email on file:</strong> {emailOnFile || '—'}
      </p>
      <p className="nwrma-form-intake-status__hint">
        You will receive an email when your payment is verified. Only then can you continue this
        application. This page will update automatically while you wait.
      </p>
    </div>
  )
}

export function PaymentIntakeResumePanel({
  intakeReference,
  organisationName,
  financeReceiptNumber,
  onContinue,
  busy,
}: {
  intakeReference: string
  organisationName: string
  financeReceiptNumber?: string | null
  onContinue: () => void | Promise<void>
  busy?: boolean
}) {
  return (
    <div className="nwrma-form-intake-status nwrma-form-intake-status--validated">
      <CheckCircle2 className="nwrma-form-intake-status__icon" aria-hidden />
      <h2 className="nwrma-form-intake-status__title">Payment verified</h2>
      <p className="nwrma-form-intake-status__text">
        Your administrative fee payment ({intakeReference}) for <strong>{organisationName}</strong>{' '}
        has been verified by NWRMA Finance. Click below to open your application form.
      </p>
      {financeReceiptNumber?.trim() ? (
        <p className="nwrma-form-intake-status__meta">
          <strong>Official receipt number:</strong> {financeReceiptNumber.trim()}
        </p>
      ) : null}
      <p className="nwrma-form-intake-status__hint">
        For security, the email link only prepares your session — you must confirm here to continue.
      </p>
      <button
        type="button"
        className="nwrma-btn-primary mt-4"
        onClick={() => void onContinue()}
        disabled={busy}
      >
        {busy ? (
          <>
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden />
            Opening application…
          </>
        ) : (
          'Continue application'
        )}
      </button>
    </div>
  )
}

export function PaymentIntakeRejectedPanel({
  intakeReference,
  validationNote,
  onStartNewPayment,
}: {
  intakeReference: string
  validationNote: string | null
  onStartNewPayment?: () => void
}) {
  return (
    <div className="nwrma-form-intake-status nwrma-form-intake-status--rejected">
      <XCircle className="nwrma-form-intake-status__icon" aria-hidden />
      <h2 className="nwrma-form-intake-status__title">Payment receipt not verified</h2>
      <p className="nwrma-form-intake-status__text">
        We could not verify your administrative fee payment ({intakeReference}). You cannot
        continue this application at this time.
      </p>
      {validationNote ? (
        <p className="nwrma-form-intake-status__note">
          <strong>Message from NWRMA Finance:</strong> {validationNote}
        </p>
      ) : null}
      <p className="nwrma-form-intake-status__hint">
        To apply again, upload a new bank receipt from the Instructions step, or return to{' '}
        <Link href="/online-forms" className="nwrma-link">
          Online Forms
        </Link>
        .
      </p>
      {onStartNewPayment ? (
        <button type="button" className="nwrma-btn-primary mt-4" onClick={onStartNewPayment}>
          Upload new payment
        </button>
      ) : null}
    </div>
  )
}
