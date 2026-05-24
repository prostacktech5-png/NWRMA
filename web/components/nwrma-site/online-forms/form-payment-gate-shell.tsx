'use client'

import type { ReactNode } from 'react'
import {
  PaymentIntakeRejectedPanel,
  PaymentIntakeResumePanel,
  PaymentIntakeWaitingPanel,
} from '@/components/nwrma-site/online-forms/payment-intake-status-panel'
import type { usePaymentIntakeGate } from '@/components/nwrma-site/online-forms/use-payment-intake-gate'

type Gate = ReturnType<typeof usePaymentIntakeGate>

export function FormPaymentGateMessages({
  gate,
  applicantEmail,
}: {
  gate: Gate
  applicantEmail: string
}) {
  return (
    <>
      {gate.gateError ? (
        <p className="nwrma-form-error" role="alert">
          {gate.gateError}
        </p>
      ) : null}
      {gate.statusLoading ? (
        <p className="nwrma-muted py-8 text-center">
          {gate.resumeActivating ? 'Opening your application…' : 'Loading…'}
        </p>
      ) : gate.phase === 'resume_ready' ? (
        <PaymentIntakeResumePanel
          intakeReference={gate.intakeReference}
          organisationName={gate.organisationName}
          financeReceiptNumber={gate.financeReceiptNumber}
          onContinue={gate.redeemResume}
          busy={gate.submittingIntake}
        />
      ) : gate.phase === 'pending' ? (
        <PaymentIntakeWaitingPanel
          intakeReference={gate.intakeReference}
          email={gate.intakeEmail || applicantEmail}
        />
      ) : gate.phase === 'rejected' ? (
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
  step,
  targetStep,
  children,
}: {
  gate: Gate
  step: number
  targetStep: number
  children: ReactNode
}) {
  if (!gate.showWizardStep(step, targetStep)) return null
  return <>{children}</>
}
