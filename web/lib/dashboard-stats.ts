import type { LucideIcon } from 'lucide-react'
import {
  FileText,
  Clock,
  BarChart3,
  MapPin,
  Landmark,
  FlaskConical,
} from 'lucide-react'
import { formatCurrency } from '@/lib/mock-data'
import { isOrgWideRole } from '@/lib/department-scope'
import type {
  LabRequest,
  MonitoringStation,
  ProgrammeBudgetLine,
  Requisition,
  User,
  WaterLevelReading,
} from '@/lib/types'

export const pendingApprovalStatuses = [
  'submitted',
  'hod_review',
  'admin_review',
  'dg_review',
  'finance_review',
] as const

export type DashboardReferenceSlices = {
  requisitions: Requisition[]
  labRequests: LabRequest[]
  budgetLines: ProgrammeBudgetLine[]
  monitoringStations: MonitoringStation[]
  waterLevelReadings: WaterLevelReading[]
}

export function scopeRequisitions(user: User, ref: DashboardReferenceSlices) {
  if (isOrgWideRole(user)) return ref.requisitions
  if (!user.department) return []
  return ref.requisitions.filter((r) => r.department === user.department)
}

export function scopeBudgetLines(user: User, ref: DashboardReferenceSlices) {
  if (isOrgWideRole(user)) return ref.budgetLines
  if (!user.department) return []
  return ref.budgetLines.filter((bl) => bl.department === user.department)
}

export function scopeLabRequests(user: User, ref: DashboardReferenceSlices) {
  if (isOrgWideRole(user)) return ref.labRequests
  if (user.department === 'hydrological') return ref.labRequests
  return []
}

export type DashboardStatCard = {
  title: string
  value: number
  valueDisplay?: string
  change?: string
  trend: 'up' | 'down' | 'neutral'
  icon: LucideIcon
  href: string
}

/** Main ERP dashboard — scoped by signed-in user. */
export function buildStatCards(
  user: User,
  scopedReqs: Requisition[],
  scopedLab: LabRequest[],
  scopedBudget: ProgrammeBudgetLine[],
  ref: DashboardReferenceSlices,
  liveReadingCount?: number | null
): DashboardStatCard[] {
  const org = isOrgWideRole(user)
  const d = user.department
  const hydroView = org || d === 'hydrological'

  const stationTotal = ref.monitoringStations.length
  const stationsActive = ref.monitoringStations.filter((s) => s.status === 'active').length
  const stationsOffline = stationTotal - stationsActive

  const totalAllocated = scopedBudget.reduce((sum, bl) => sum + bl.allocatedAmount, 0)

  const pendingLab = scopedLab.filter((l) =>
    ['received', 'in_progress', 'assigned', 'testing', 'review'].includes(l.status)
  ).length
  const globalPending = ref.requisitions.filter((r) =>
    pendingApprovalStatuses.includes(r.status as (typeof pendingApprovalStatuses)[number])
  ).length
  const scopedPending = scopedReqs.filter((r) =>
    pendingApprovalStatuses.includes(r.status as (typeof pendingApprovalStatuses)[number])
  ).length

  const pendingHref =
    d === 'hydrological'
      ? '/hydrological/budget/requisitions'
      : org
        ? '/dg'
        : '/finance/requisitions'

  const out: DashboardStatCard[] = []

  const readingsFallback = ref.waterLevelReadings.length
  const readingsCount =
    typeof liveReadingCount === 'number' && !Number.isNaN(liveReadingCount)
      ? liveReadingCount
      : readingsFallback

  if (hydroView) {
    out.push({
      title: 'Water level readings',
      value: readingsCount,
      change: 'Across monitoring network',
      trend: 'neutral',
      icon: BarChart3,
      href: '/hydrological/readings',
    })
    out.push({
      title: 'Flood forecasting',
      value: stationTotal,
      change:
        stationsOffline === 0
          ? `${stationsActive} active`
          : `${stationsActive} active · ${stationsOffline} offline`,
      trend: stationsOffline > 0 ? 'down' : 'neutral',
      icon: MapPin,
      href: '/hydrological/monitoring',
    })
  }

  out.push({
    title: 'Total budget',
    value: totalAllocated,
    valueDisplay: formatCurrency(totalAllocated),
    change: 'Allocated (your scope)',
    trend: 'neutral',
    icon: Landmark,
    href: d === 'hydrological' ? '/hydrological/budget' : '/finance/budgets',
  })

  out.push({
    title: 'Total requisitions',
    value: org ? ref.requisitions.length : scopedReqs.length,
    change: org ? 'All programmes' : 'Your department',
    trend: 'up',
    icon: FileText,
    href:
      d === 'hydrological'
        ? '/hydrological/budget/requisitions'
        : d === 'hr'
          ? '/hr/requisitions'
          : '/finance/requisitions',
  })

  out.push({
    title: org ? 'Pending Approvals' : 'Pending (your dept)',
    value: org ? globalPending : scopedPending,
    change: org ? 'Needs attention' : 'Workflow',
    trend: 'neutral',
    icon: Clock,
    href: pendingHref,
  })

  if (org || d === 'hydrological') {
    out.push({
      title: 'Lab pipeline',
      value: pendingLab,
      change: org ? '1 critical' : 'Open work',
      trend: 'neutral',
      icon: FlaskConical,
      href: '/hydrological/water-testing',
    })
  }

  return out
}

/**
 * Hydrological department hub (/hydrological) — always uses hydrological programme
 * slice so admin/DG see the same scope as HoD.
 */
export function buildHydrologicalHubStatCards(
  ref: DashboardReferenceSlices,
  liveReadingCount?: number | null
): DashboardStatCard[] {
  const hydroReqs = ref.requisitions.filter((r) => r.department === 'hydrological')
  const hydroBudget = ref.budgetLines.filter((bl) => bl.department === 'hydrological')
  const stationTotal = ref.monitoringStations.length
  const stationsActive = ref.monitoringStations.filter((s) => s.status === 'active').length
  const stationsOffline = stationTotal - stationsActive
  const totalAllocated = hydroBudget.reduce((sum, bl) => sum + bl.allocatedAmount, 0)
  const pending = hydroReqs.filter((r) =>
    pendingApprovalStatuses.includes(r.status as (typeof pendingApprovalStatuses)[number])
  ).length
  const readings =
    typeof liveReadingCount === 'number' && !Number.isNaN(liveReadingCount)
      ? liveReadingCount
      : ref.waterLevelReadings.length

  return [
    {
      title: 'Water level readings',
      value: readings,
      change: 'Live store + seed data',
      trend: 'neutral',
      icon: BarChart3,
      href: '/hydrological/readings',
    },
    {
      title: 'Flood forecasting',
      value: stationTotal,
      change:
        stationsOffline === 0
          ? `${stationsActive} active`
          : `${stationsActive} active · ${stationsOffline} offline`,
      trend: stationsOffline > 0 ? 'down' : 'neutral',
      icon: MapPin,
      href: '/hydrological/monitoring',
    },
    {
      title: 'Total budget',
      value: totalAllocated,
      valueDisplay: formatCurrency(totalAllocated),
      trend: 'neutral',
      icon: Landmark,
      href: '/hydrological/budget',
    },
    {
      title: 'Total requisitions',
      value: hydroReqs.length,
      trend: 'up',
      icon: FileText,
      href: '/hydrological/budget/requisitions',
    },
    {
      title: 'Pending (hydro)',
      value: pending,
      trend: 'neutral',
      icon: Clock,
      href: '/hydrological/budget/requisitions',
    },
  ]
}

export function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    submitted: 'bg-primary/10 text-primary',
    hod_review: 'bg-warning/10 text-warning-foreground',
    admin_review: 'bg-warning/10 text-warning-foreground',
    dg_review: 'bg-warning/10 text-warning-foreground',
    finance_review: 'bg-warning/10 text-warning-foreground',
    approved: 'bg-secondary/10 text-secondary',
    rejected: 'bg-destructive/10 text-destructive',
    paid: 'bg-secondary/10 text-secondary',
    received: 'bg-primary/10 text-primary',
    assigned: 'bg-primary/10 text-primary',
    testing: 'bg-warning/10 text-warning-foreground',
    review: 'bg-warning/10 text-warning-foreground',
    completed: 'bg-secondary/10 text-secondary',
    released: 'bg-secondary/10 text-secondary',
  }
  return colors[status] || 'bg-muted text-muted-foreground'
}

export function getPriorityColor(priority: string) {
  const colors: Record<string, string> = {
    normal: 'bg-muted text-muted-foreground',
    urgent: 'bg-warning/10 text-warning-foreground',
    critical: 'bg-destructive/10 text-destructive',
  }
  return colors[priority] || 'bg-muted text-muted-foreground'
}
