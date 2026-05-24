import { formatDateValue } from '@/lib/erp-formatting'
import { isBlank } from '@/lib/online-form-readonly-completeness'
import { cn } from '@/lib/utils'

function toDisplay(value: unknown): string {
  if (value == null || value === '') return ''
  if (value instanceof Date) return formatDateValue(value, '')
  return String(value)
}

export function PortalReadonlyField({
  label,
  value,
  highlightIfEmpty = true,
  className,
}: {
  label: string
  value: unknown
  highlightIfEmpty?: boolean
  className?: string
}) {
  const display = toDisplay(value)
  const empty = isBlank(value)

  return (
    <div className={cn('nwrma-field', className)}>
      <span className="nwrma-field-label">{label}</span>
      <div
        className={cn(
          'portal-readonly-value',
          highlightIfEmpty && empty && 'portal-readonly-value--empty'
        )}
        title={empty ? 'Not provided' : undefined}
      >
        {display || '—'}
      </div>
    </div>
  )
}
