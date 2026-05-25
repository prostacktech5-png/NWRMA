'use client'

import type { ReactNode } from 'react'
import {
  PaymentIntakeRejectedPanel,
  PaymentIntakeResumePanel,
  PaymentIntakeVerifiedEmailPanel,
  PaymentIntakeWaitingPanel,
} from '@/components/nwrma-site/online-forms/payment-intake-status-panel'
import { ApplicationAmendFormBanner } from '@/components/nwrma-site/online-forms/application-amend-form-banner'
import type { useApplicationAmendment } from '@/components/nwrma-site/online-forms/use-application-amendment'
import type { usePaymentIntakeGate } from '@/components/nwrma-site/online-forms/use-payment-intake-gate'

type Gate = ReturnType<typeof usePaymentIntakeGate>
type Amend = ReturnType<typeof useApplicationAmendment>

export function FormPaymentGateMessages({
  gate,
  applicantEmail,
  amend,
}: {
  gate: Gate
  applicantEmail: string
  amend?: Amend
}) {
  const skipPaymentGateUi = amend?.isAmendMode ?? false

  return (
    <>
      {amend ? <ApplicationAmendFormBanner amend={amend} /> : null}

      {!skipPaymentGateUi && gate.gateError ? (
        <p className="nwrma-form-error" role="alert">
          {gate.gateError}
        </p>
      ) : null}
      {!skipPaymentGateUi && gate.statusLoading ? (
        <p className="nwrma-muted py-8 text-center">
          {gate.resumeActivating ? 'Opening your application…' : 'Loading…'}
        </p>
      ) : !skipPaymentGateUi && gate.phase === 'resume_ready' ? (
        <PaymentIntakeResumePanel
          intakeReference={gate.intakeReference}
          organisationName={gate.organisationName}
          financeReceiptNumber={gate.financeReceiptNumber}
          onContinue={gate.redeemResume}
          busy={gate.submittingIntake}
        />
      ) : !skipPaymentGateUi && gate.phase === 'pending' ? (
        <PaymentIntakeWaitingPanel
          intakeReference={gate.intakeReference}
          email={gate.intakeEmail || applicantEmail}
        />
      ) : !skipPaymentGateUi && gate.phase === 'verified_pending_email' ? (
        <PaymentIntakeVerifiedEmailPanel
          intakeReference={gate.intakeReference}
          email={gate.intakeEmail || applicantEmail}
          financeReceiptNumber={gate.financeReceiptNumber}
        />
      ) : !skipPaymentGateUi && gate.phase === 'rejected' ? (
        <PaymentIntakeRejectedPanel
          intakeReference={gate.intakeReference}
          validationNote={gate.validationNote}
          onStartNewPayment={() => gate.resetForNewPayment(null)}
        />
      ) : null}
    </>
  )
}

export function FormPaymentGateWizardStep({
  gate,
  amend,
  step,
  targetStep,
  children,
}: {
  gate: Gate
  amend?: Amend
  step: number
  targetStep: number
  children: ReactNode
}) {
  const show = amend
    ? amend.phase !== 'loading' &&
      amend.phase !== 'error' &&
      (amend.canAccessWizardSteps
        ? step === targetStep
        : gate.showWizardStep(step, targetStep))
    : gate.showWizardStep(step, targetStep)
  if (!show) return null
  return <>{children}</>
}
