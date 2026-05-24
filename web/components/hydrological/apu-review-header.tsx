'use client'

import { apuFormTitle } from '@/lib/hydrological-application-processing'
import type { OnlineFormSlug } from '@/lib/hydrological-application-processing'

export function ApuReviewHeader({
  formSlug,
  reference,
  intakeReference,
  organisationName,
}: {
  formSlug: OnlineFormSlug
  reference: string
  intakeReference?: string | null
  organisationName?: string
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">
        Hydrological Services — Application processing unit
      </p>
      <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Application review</h1>
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{apuFormTitle(formSlug)}</span>
        {' · '}
        <span className="font-mono">{reference}</span>
        {intakeReference ? (
          <>
            {' · '}
            Payment intake <span className="font-mono">{intakeReference}</span>
          </>
        ) : null}
        {organisationName ? (
          <>
            {' · '}
            {organisationName}
          </>
        ) : null}
      </p>
      <p className="text-xs text-muted-foreground">
        Review matches the official portal form layout. Empty or missing items are highlighted in
        amber below.
      </p>
    </div>
  )
}
