'use client'

import type { ReactNode } from 'react'

export function PortalFormReviewShell({
  documentTitle,
  reference,
  children,
  topSlot,
}: {
  documentTitle: string
  reference: string
  children: ReactNode
  topSlot?: ReactNode
}) {
  return (
    <div className="portal-form-review nwrma-form-prose">
      {topSlot}
      <div className="portal-form-review__agency-bar">
        National Water Resources Management Agency
      </div>
      <div className="portal-form-review__doc-frame">
        <h2 className="portal-form-review__doc-title">{documentTitle}</h2>
        <p className="portal-form-review__meta">
          Application reference: <strong className="font-mono text-foreground">{reference}</strong>
          {' — '}
          Submitted copy for staff review (same layout as the public online form)
        </p>
        {children}
      </div>
    </div>
  )
}
