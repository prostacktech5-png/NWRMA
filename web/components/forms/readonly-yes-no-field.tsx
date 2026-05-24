'use client'

import { isBlank } from '@/lib/online-form-readonly-completeness'
import { cn } from '@/lib/utils'

export function ReadonlyYesNoField({
  label,
  included,
  reasonIfNo,
}: {
  label: string
  included: string
  reasonIfNo?: string
}) {
  const text =
    included === 'yes' ? 'Yes' : included === 'no' ? 'No' : included === 'na' ? 'N/A' : included
  const needsAttention =
    isBlank(included) || (included === 'no' && isBlank(reasonIfNo))

  return (
    <div
      className={cn(
        'space-y-1 border-b border-gray-100 pb-2 last:border-0',
        needsAttention && 'rounded-md bg-amber-50 px-2 py-1 ring-1 ring-amber-200'
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{text || '—'}</p>
      {included === 'no' && reasonIfNo ? (
        <p className="text-xs text-muted-foreground">Reason: {reasonIfNo}</p>
      ) : included === 'no' && isBlank(reasonIfNo) ? (
        <p className="text-xs text-amber-800">No reason provided</p>
      ) : null}
    </div>
  )
}
