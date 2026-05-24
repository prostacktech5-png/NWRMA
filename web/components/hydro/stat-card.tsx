import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  className?: string
}

export function StatCard({ title, value, hint, icon, className }: StatCardProps) {
  return (
    <Card className={cn('min-w-0', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="min-w-0 max-w-full text-lg font-bold tabular-nums leading-snug [overflow-wrap:anywhere] sm:text-xl md:text-2xl">
            {value}
          </span>
          {icon ? <span className="shrink-0 [&_svg]:shrink-0">{icon}</span> : null}
        </div>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
