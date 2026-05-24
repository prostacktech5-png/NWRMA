import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  officerPaymentStatusLabels,
  requisitionStatusLabels,
} from '@/lib/mock-data'

const reqColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  submitted: 'bg-primary/10 text-primary border-primary/30',
  hod_review: 'bg-amber-500/10 text-amber-800 border-amber-500/30 dark:text-amber-400',
  admin_review: 'bg-blue-500/10 text-blue-800 border-blue-500/30 dark:text-blue-400',
  dg_review: 'bg-amber-500/10 text-amber-800 border-amber-500/30 dark:text-amber-400',
  finance_review: 'bg-violet-500/10 text-violet-800 border-violet-500/30 dark:text-violet-400',
  approved: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/30 dark:text-emerald-400',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
  paid: 'bg-secondary/10 text-secondary border-secondary/30',
}

const payColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-800 border-amber-500/30 dark:text-amber-400',
  submitted: 'bg-primary/10 text-primary border-primary/30',
  approved: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/30 dark:text-emerald-400',
  disbursed: 'bg-muted text-muted-foreground border-border',
}

const leaveTypeLabels: Record<string, string> = {
  annual: 'Annual',
  sick: 'Sick',
  maternity: 'Maternity',
  paternity: 'Paternity',
  compassionate: 'Compassionate',
  unpaid: 'Unpaid',
}

const leaveStatusLabels: Record<string, string> = {
  hod_review: 'Awaiting HR HoD',
  dg_review: 'Awaiting DG',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
}

function labelFor(status: string): string {
  if (requisitionStatusLabels[status]) return requisitionStatusLabels[status]
  if (officerPaymentStatusLabels[status]) return officerPaymentStatusLabels[status]
  if (leaveTypeLabels[status]) return leaveTypeLabels[status]
  if (leaveStatusLabels[status]) return leaveStatusLabels[status]
  return status.replace(/_/g, ' ')
}

function classFor(status: string): string {
  if (reqColors[status]) return reqColors[status]
  if (payColors[status]) return payColors[status]
  if (leaveTypeLabels[status]) {
    return 'bg-sky-500/10 text-sky-800 border-sky-500/30 dark:text-sky-400'
  }
  if (leaveStatusLabels[status]) {
    return 'bg-zinc-500/10 text-zinc-800 border-zinc-500/30 dark:text-zinc-300'
  }
  return 'bg-muted text-muted-foreground border-border'
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn('font-medium capitalize', classFor(status), className)}>
      {labelFor(status)}
    </Badge>
  )
}
