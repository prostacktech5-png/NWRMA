import { isBlank } from '@/lib/online-form-readonly-completeness'
import { cn } from '@/lib/utils'

export function PortalReadonlyYesNo({
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
  const warn = isBlank(included) || (included === 'no' && isBlank(reasonIfNo))

  return (
    <div className={cn('portal-readonly-yesno', warn && 'portal-readonly-yesno--warn')}>
      <span className="portal-readonly-yesno__label">{label}</span>
      <span className="portal-readonly-yesno__value">{isBlank(included) ? '—' : text}</span>
      {included === 'no' && reasonIfNo ? (
        <p className="col-span-2 text-xs text-muted-foreground">Reason: {reasonIfNo}</p>
      ) : null}
      {included === 'no' && isBlank(reasonIfNo) ? (
        <p className="col-span-2 text-xs text-amber-800">No reason provided</p>
      ) : null}
    </div>
  )
}
