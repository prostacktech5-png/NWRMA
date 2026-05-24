import { cn } from '@/lib/utils'

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
}: {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  variant?: 'default' | 'warning' | 'success'
}) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-5 shadow-sm',
        variant === 'warning' &&
          'border-amber-200/90 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20',
        variant === 'success' &&
          'border-emerald-200/90 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">{value}</p>
          {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  )
}
