import { Badge } from '@/components/ui/badge'
import type { OfficerPaymentStatus } from '@/lib/types'
import { officerPaymentStatusLabels } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

const statusStyles: Record<OfficerPaymentStatus, string> = {
  pending: 'bg-warning/10 text-warning-foreground border-warning/30',
  submitted: 'bg-primary/10 text-primary border-primary/30',
  approved: 'bg-secondary/10 text-secondary border-secondary/30',
  disbursed: 'bg-muted text-muted-foreground border-border',
}

export function StatusBadge({
  status,
  className,
}: {
  status: OfficerPaymentStatus
  className?: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn('font-normal', statusStyles[status], className)}
    >
      {officerPaymentStatusLabels[status] ?? status}
    </Badge>
  )
}
