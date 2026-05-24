'use client'

import Link from 'next/link'
import { Children, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Factory,
  FileText,
  Inbox,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatCurrency } from '@/lib/mock-data'
import {
  formatDateValue,
  licenseApplicationStatusLabels,
} from '@/lib/erp-formatting'
import { useSessionUser } from '@/components/demo-session-provider'
import { useErpReference } from '@/components/reference-data-provider'
import { BOREHOLES_DASHBOARD_KEY } from '@/lib/boreholes-department-sync'
import { resolvedApiUrl } from '@/lib/apiBase'
import type { Borehole, Survey123BoreholeIntake, Survey123IntakeSummary } from '@/lib/types'

type FinanceBudgetLineJson = {
  id: number
  budgetCode: string
  project: string
  totalAmount: number
  utilizedAmount: number
  availableBalance: number
  fiscalYear: string
}

type DepartmentBudgetPayload = {
  lines: FinanceBudgetLineJson[]
  totals: {
    totalAllocated: number
    totalUtilized: number
    totalAvailable: number
  }
}

type StatCard = {
  title: string
  value: number | string
  change: string
  href: string
  icon: LucideIcon
}

const LICENCE_PENDING = ['submitted', 'under_review', 'additional_info_required'] as const

type DashboardLiveData = {
  pending: Survey123IntakeSummary[]
  approved: Borehole[]
  survey123Intakes: Survey123BoreholeIntake[]
  liveBudget: DepartmentBudgetPayload | null
}

export default function BoreholesDashboardPage() {
  const { user, actingUserHeaders } = useSessionUser()
  const { data } = useErpReference()

  const {
    data: live,
    isLoading,
    isFetching,
    refetch,
    isError,
  } = useQuery({
    queryKey: [...BOREHOLES_DASHBOARD_KEY],
    queryFn: async (): Promise<DashboardLiveData> => {
      const [queueRes, intakesRes, budgetRes] = await Promise.all([
        fetch(resolvedApiUrl('/api/boreholes/registry-queue'), {
          headers: { ...actingUserHeaders },
          credentials: 'same-origin',
          cache: 'no-store',
        }),
        fetch(resolvedApiUrl('/api/boreholes/survey123-intakes'), {
          headers: { ...actingUserHeaders },
          credentials: 'same-origin',
          cache: 'no-store',
        }),
        fetch(resolvedApiUrl('/api/finance/department-budget?department=boreholes'), {
          credentials: 'include',
          cache: 'no-store',
        }),
      ])

      let pending: Survey123IntakeSummary[] = []
      let approved: Borehole[] = []
      if (queueRes.ok) {
        const q = (await queueRes.json()) as {
          pending: Survey123IntakeSummary[]
          approved: Borehole[]
        }
        pending = q.pending ?? []
        approved = q.approved ?? []
      }

      let survey123Intakes: Survey123BoreholeIntake[] = []
      if (intakesRes.ok) {
        const body = (await intakesRes.json()) as { intakes: Survey123BoreholeIntake[] }
        survey123Intakes = (body.intakes ?? []).map((i) => ({
          ...i,
          receivedAt: new Date(i.receivedAt),
          createdAt: new Date(i.createdAt),
        }))
      }

      let liveBudget: DepartmentBudgetPayload | null = null
      if (budgetRes.ok) {
        const j = (await budgetRes.json()) as DepartmentBudgetPayload
        if (j && typeof j === 'object' && 'totals' in j && Array.isArray(j.lines)) {
          liveBudget = j
        }
      }

      return { pending, approved, survey123Intakes, liveBudget }
    },
  })

  const pendingRegistry = live?.pending ?? []
  const approvedBoreholes = live?.approved ?? []
  const survey123Intakes = live?.survey123Intakes ?? []
  const liveBudget = live?.liveBudget ?? null
  const loadError = isError
    ? 'Some live data could not be refreshed. Showing reference data where available.'
    : null
  const loading = isLoading || isFetching

  const applications = data.licenseApplications
  const drillingCompanies = data.drillingCompanies

  const licencePendingCount = applications.filter((a) =>
    LICENCE_PENDING.includes(a.status as (typeof LICENCE_PENDING)[number])
  ).length
  const licenceSubmittedCount = applications.filter((a) => a.status === 'submitted').length

  const survey123ReceivedCount = survey123Intakes.filter((i) => i.status === 'received').length
  const activeCompanies = drillingCompanies.filter((c) => c.status === 'active').length

  const districtsCovered = new Set(approvedBoreholes.map((b) => b.district)).size

  const boreholesBudgetErp = useMemo(
    () => data.programmeBudgetLines.filter((bl) => bl.department === 'boreholes'),
    [data.programmeBudgetLines]
  )

  const budgetLinesForOverview = useMemo(() => {
    if (liveBudget && liveBudget.lines.length > 0) {
      return liveBudget.lines.map((l) => ({
        id: String(l.id),
        programmeCode: l.budgetCode,
        programmeName: l.project,
        allocatedAmount: l.totalAmount,
        utilizedAmount: l.utilizedAmount,
      }))
    }
    return boreholesBudgetErp
  }, [liveBudget, boreholesBudgetErp])

  const totalAllocated = useMemo(
    () =>
      liveBudget && liveBudget.lines.length > 0
        ? liveBudget.totals.totalAllocated
        : boreholesBudgetErp.reduce((sum, bl) => sum + bl.allocatedAmount, 0),
    [liveBudget, boreholesBudgetErp]
  )
  const totalUtilized = useMemo(
    () =>
      liveBudget && liveBudget.lines.length > 0
        ? liveBudget.totals.totalUtilized
        : boreholesBudgetErp.reduce((sum, bl) => sum + bl.utilizedAmount, 0),
    [liveBudget, boreholesBudgetErp]
  )
  const utilizationPercent =
    totalAllocated > 0 ? Math.round((totalUtilized / totalAllocated) * 100) : 0

  const statCards: StatCard[] = [
    {
      title: 'Pending registry review',
      value: pendingRegistry.length,
      change: 'Survey123 submissions awaiting ID assignment',
      href: '/boreholes/registry',
      icon: Clock,
    },
    {
      title: 'Survey123 received',
      value: survey123ReceivedCount,
      change: 'Field data not yet registered',
      href: '/boreholes/survey123',
      icon: Inbox,
    },
    {
      title: 'Licences awaiting action',
      value: licencePendingCount,
      change:
        licenceSubmittedCount > 0
          ? `${licenceSubmittedCount} new portal submission${licenceSubmittedCount === 1 ? '' : 's'}`
          : 'Portal drilling licence applications',
      href: '/boreholes/license-applications',
      icon: ClipboardCheck,
    },
    {
      title: 'Active drilling companies',
      value: activeCompanies,
      change: `${drillingCompanies.length} total in registry`,
      href: '/boreholes/companies',
      icon: Factory,
    },
    {
      title: 'Approved boreholes',
      value: approvedBoreholes.length,
      change: `${districtsCovered} district${districtsCovered === 1 ? '' : 's'} covered`,
      href: '/boreholes/registry',
      icon: CheckCircle2,
    },
    {
      title: 'Programme budget',
      value: formatCurrency(totalAllocated),
      change: `${utilizationPercent}% utilized`,
      href: '/boreholes/budget',
      icon: Wallet,
    },
  ]

  const pendingLicences = useMemo(
    () =>
      applications
        .filter((a) => LICENCE_PENDING.includes(a.status as (typeof LICENCE_PENDING)[number]))
        .slice(0, 5),
    [applications]
  )

  const recentSurvey123 = useMemo(
    () =>
      survey123Intakes
        .filter((i) => i.status === 'received')
        .sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime())
        .slice(0, 5),
    [survey123Intakes]
  )

  const pendingRegistryPreview = pendingRegistry.slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Boreholes dashboard</h1>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={loading}
        >
          {loading ? 'Refreshing…' : 'Refresh data'}
        </Button>
      </div>

      {loadError ? (
        <p className="text-sm text-amber-700 dark:text-amber-400" role="status">
          {loadError}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{stat.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{stat.change}</p>
              <Link
                href={stat.href}
                className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Open <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Budget overview</CardTitle>
              <CardDescription>
                {liveBudget && liveBudget.lines.length > 0
                  ? 'Live allocation from Finance programme budgets'
                  : 'Borehole registry programme lines (reference data if no finance lines)'}
              </CardDescription>
            </div>
            <Link href="/boreholes/budget">
              <Button variant="outline" size="sm">
                Open budget
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="mb-6 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Utilization</span>
                <span className="font-medium">{utilizationPercent}%</span>
              </div>
              <Progress value={utilizationPercent} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Utilized: {formatCurrency(totalUtilized)}</span>
                <span>Allocated: {formatCurrency(totalAllocated)}</span>
              </div>
            </div>
            <div className="space-y-4">
              {budgetLinesForOverview.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No borehole programme lines yet. Finance can add them under Finance → Budgets
                  (department: Boreholes).
                </p>
              ) : (
                budgetLinesForOverview.map((bl) => {
                  const alloc = bl.allocatedAmount
                  const util = Math.min(bl.utilizedAmount, alloc)
                  const lineUtil = alloc > 0 ? Math.round((util / alloc) * 100) : 0
                  return (
                    <div key={bl.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {bl.programmeCode}
                          </Badge>
                          <span className="text-sm font-medium">{bl.programmeName}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{lineUtil}%</span>
                      </div>
                      <Progress value={lineUtil} className="h-1.5" />
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Needs attention</CardTitle>
            <CardDescription>Pending registry, licences, and Survey123 intake</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <AttentionBlock
              title="Registry review"
              empty="No submissions awaiting borehole ID assignment."
              href="/boreholes/registry"
            >
              {pendingRegistryPreview.map((p) => (
                <AttentionRow
                  key={p.id}
                  primary={p.matchedCompanyName ?? p.drillingCompanyName ?? 'Unknown company'}
                  secondary={
                    p.locationDescription ??
                    [p.districtLabel, p.chiefdomLabel].filter(Boolean).join(', ') ??
                    'Pending submission'
                  }
                />
              ))}
            </AttentionBlock>
            <AttentionBlock
              title="Drilling licences"
              empty="No licence applications awaiting action."
              href="/boreholes/license-applications"
            >
              {pendingLicences.map((app) => (
                <AttentionRow
                  key={app.id}
                  primary={app.organisationName}
                  secondary={`${app.reference} · ${licenseApplicationStatusLabels[app.status] ?? app.status}`}
                  href={`/boreholes/license-applications/${app.id}`}
                />
              ))}
            </AttentionBlock>
            <AttentionBlock
              title="Survey123 intake"
              empty="No received Survey123 submissions."
              href="/boreholes/survey123"
            >
              {recentSurvey123.map((i) => (
                <AttentionRow
                  key={i.id}
                  primary={i.drillingCompanyName ?? '—'}
                  secondary={
                    i.locationDescription ?? formatDateValue(i.receivedAt)
                  }
                />
              ))}
            </AttentionBlock>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick links</CardTitle>
          <CardDescription>Jump to operational tools</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLink href="/boreholes/registry" icon={FileText} label="Borehole registry" />
          <QuickLink
            href="/boreholes/license-applications"
            icon={ClipboardCheck}
            label="Review drilling licence"
          />
          <QuickLink href="/boreholes/companies" icon={Factory} label="Drilling companies" />
          <QuickLink href="/boreholes/survey123" icon={Inbox} label="Survey123 borehole data" />
          <QuickLink href="/boreholes/budget" icon={Wallet} label="Department budget" />
          <QuickLink href="/boreholes/reports" icon={Building2} label="Reports" />
        </CardContent>
      </Card>
    </div>
  )
}

function AttentionBlock({
  title,
  empty,
  href,
  children,
}: {
  title: string
  empty: string
  href: string
  children: ReactNode
}) {
  const hasItems = Children.count(children) > 0
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <Link href={href} className="text-xs text-primary hover:underline">
          View all
        </Link>
      </div>
      {hasItems ? (
        <ul className="space-y-2">{children}</ul>
      ) : (
        <p className="text-xs text-muted-foreground">{empty}</p>
      )}
    </div>
  )
}

function AttentionRow({
  primary,
  secondary,
  href,
}: {
  primary: string
  secondary: string
  href?: string
}) {
  const content = (
    <li className="rounded-lg border border-border px-3 py-2">
      <p className="text-sm font-medium line-clamp-1">{primary}</p>
      <p className="text-xs text-muted-foreground line-clamp-1">{secondary}</p>
    </li>
  )
  if (href) {
    return (
      <Link href={href} className="block transition-colors hover:bg-muted/50 rounded-lg">
        {content}
      </Link>
    )
  }
  return content
}

function QuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: LucideIcon
  label: string
}) {
  return (
    <Link href={href}>
      <Button variant="outline" className="w-full justify-start gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </Button>
    </Link>
  )
}
