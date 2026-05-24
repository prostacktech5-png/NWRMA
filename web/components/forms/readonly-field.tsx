import { formatDateValue } from '@/lib/erp-formatting'
import { isBlank } from '@/lib/online-form-readonly-completeness'
import { cn } from '@/lib/utils'

function toReadOnlyDisplay(value: unknown): string {
  if (value == null || value === '') return ''
  if (value instanceof Date) return formatDateValue(value, '')
  return String(value)
}

export function ReadOnlyField({
  label,
  value,
  highlightIfEmpty = false,
}: {
  label: string
  value: unknown
  highlightIfEmpty?: boolean
}) {
  const display = toReadOnlyDisplay(value)
  const empty = isBlank(value)
  const showHighlight = highlightIfEmpty && empty

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          'whitespace-pre-wrap text-sm text-foreground',
          showHighlight && 'rounded-md bg-amber-50 px-2 py-1 text-amber-950 ring-1 ring-amber-200'
        )}
        title={showHighlight ? 'Not provided' : undefined}
      >
        {display || '—'}
      </p>
    </div>
  )
}
