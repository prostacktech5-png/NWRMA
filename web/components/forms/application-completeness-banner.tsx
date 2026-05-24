'use client'

import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { CompletenessReport } from '@/lib/online-form-readonly-completeness'
import { cn } from '@/lib/utils'

export function ApplicationCompletenessBanner({
  report,
  className,
}: {
  report: CompletenessReport
  className?: string
}) {
  const { summary } = report
  const hasIssues = summary.total > 0

  if (!hasIssues) {
    return (
      <div
        className={cn(
          'flex items-start gap-3 rounded-lg border border-secondary/30 bg-secondary/5 px-4 py-3',
          className
        )}
      >
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
        <div>
          <p className="text-sm font-medium text-foreground">Completeness check</p>
          <p className="text-sm text-muted-foreground">
            No obvious empty fields or missing required uploads detected. Review all sections below
            to confirm the application matches the official form.
          </p>
        </div>
      </div>
    )
  }

  const parts: string[] = []
  if (summary.emptyFields > 0) {
    parts.push(
      `${summary.emptyFields} field${summary.emptyFields === 1 ? '' : 's'} or table cell${summary.emptyFields === 1 ? '' : 's'} appear empty`
    )
  }
  if (summary.missingDocs > 0) {
    parts.push(
      `${summary.missingDocs} required document${summary.missingDocs === 1 ? '' : 's'} missing`
    )
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3',
        className
      )}
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-amber-950">Completeness check — review recommended</p>
        <p className="text-sm text-amber-900">{parts.join('; ')}.</p>
        {report.issues.length <= 12 ? (
          <ul className="mt-2 list-inside list-disc text-xs text-amber-900">
            {report.issues.map((i) => (
              <li key={i.path}>{i.label}</li>
            ))}
          </ul>
        ) : (
          <ul className="mt-2 list-inside list-disc text-xs text-amber-900">
            {report.issues.slice(0, 10).map((i) => (
              <li key={i.path}>{i.label}</li>
            ))}
            <li>…and {report.issues.length - 10} more (highlighted below)</li>
          </ul>
        )}
      </div>
    </div>
  )
}
