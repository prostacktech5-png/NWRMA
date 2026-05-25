'use client'

import type { useApplicationAmendment } from '@/components/nwrma-site/online-forms/use-application-amendment'

type Amend = ReturnType<typeof useApplicationAmendment>

export function ApplicationAmendFormBanner({ amend }: { amend: Amend }) {
  if (amend.phase === 'loading') {
    return <p className="nwrma-muted py-8 text-center">Loading your application…</p>
  }
  if (amend.phase === 'error' && amend.loadError) {
    return (
      <p className="nwrma-form-error" role="alert">
        {amend.loadError}
      </p>
    )
  }
  if (amend.phase === 'ready' && amend.reviewNote) {
    return (
      <div className="nwrma-form-intake-status nwrma-form-intake-status--pending mb-4">
        <h2 className="nwrma-form-intake-status__title">Additional information requested</h2>
        <p className="nwrma-form-intake-status__text">
          Reference <strong>{amend.reference}</strong>. Complete the sections below (missing fields
          were cleared) and resubmit.
        </p>
        <p className="nwrma-form-intake-status__note whitespace-pre-wrap">
          <strong>Message from NWRMA:</strong>
          <br />
          {amend.reviewNote}
        </p>
      </div>
    )
  }
  return null
}

export function shouldShowFormWizardStep(
  gate: { showWizardStep: (step: number, target: number) => boolean },
  amend: Amend,
  step: number,
  targetStep: number
): boolean {
  if (amend.phase === 'loading' || amend.phase === 'error') return false
  if (amend.canAccessWizardSteps) {
    return step === targetStep
  }
  return gate.showWizardStep(step, targetStep)
}
