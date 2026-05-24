'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  TrendingUp,
  TrendingDown,
  FileText,
  ArrowRight,
  BarChart3,
  MapPin,
  ScrollText,
  Wallet,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatCurrency, formatDate, requisitionStatusLabels } from '@/lib/mock-data'
import { useSessionUser } from '@/components/demo-session-provider'
import { useErpReference } from '@/components/reference-data-provider'
import {
  buildHydrologicalHubStatCards,
  getStatusColor,
  pendingApprovalStatuses,
} from '@/lib/dashboard-stats'
import { staffCanAccessHydroPath } from '@/lib/hydro-nav-access'
import { resolvedApiUrl } from '@/lib/apiBase'

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

type FinanceRequisitionJson = {
  id: number
  title: string
  description: string
  requestedBy: string
  amount: number
  status: string
  createdAt: string
}

type RecentReq = {
  id: string
  requesterName: string
  narrative: string
  amount: number
  status: string
  createdAt: Date
}

function isPendingStatus(status: string): boolean {
  return pendingApprovalStatuses.includes(status as (typeof pendingApprovalStatuses)[number])
}

export default function HydrologicalDepartmentPage() {
  const { user } = useSessionUser()
  const { dashboardSlices, data } = useErpReference()
  const [liveReadingCount, setLiveReadingCount] = useState<number | null>(null)
  const [liveBudget, setLiveBudget] = useState<DepartmentBudgetPayload | null>(null)
  const [financeReqs, setFinanceReqs] = useState<FinanceRequisitionJson[] | null>(null)
  const [liveStations, setLiveStations] = useState<{ total: number; active: number } | null>(null)
  const [liveLoadErr, setLiveLoadErr] = useState<string | null>(null)

  const loadReadingsCount = useCallback(async () => {
    try {
      const res = await fetch(resolvedApiUrl('/api/hydrological/readings'), { cache: 'no-store' })
      if (!res.ok) return
      const body = (await res.json()) as { readings?: unknown[] }
      setLiveReadingCount(Array.isArray(body.readings) ? body.readings.length : 0)
    } catch {
      setLiveReadingCount(null)
    }
  }, [])

  const loadLiveHub = useCallback(async () => {
    setLiveLoadErr(null)
    try {
      const bUrl = resolvedApiUrl('/api/finance/department-budget?department=hydrological')
      const rUrl = resolvedApiUrl('/api/finance/requisitions?department=hydrological')
      const mUrl = resolvedApiUrl('/api/hydrological/monitoring/stations?windowDays=30')

      const [bRes, rRes, mRes] = await Promise.all([
        fetch(bUrl, { credentials: 'include', cache: 'no-store' }),
        fetch(rUrl, { credentials: 'include', cache: 'no-store' }),
        fetch(mUrl, { cache: 'no-store' }),
      ])

      if (bRes.ok) {
        const j = (await bRes.json()) as DepartmentBudgetPayload
        if (j && typeof j === 'object' && 'totals' in j && Array.isArray(j.lines)) {
          setLiveBudget(j)
        } else {
          setLiveBudget(null)
        }
      } else {
        setLiveBudget(null)
      }

      if (rRes.ok) {
        const jr = await rRes.json()
        setFinanceReqs(Array.isArray(jr) ? (jr as FinanceRequisitionJson[]) : [])
      } else {
        setFinanceReqs(null)
      }

      if (mRes.ok) {
        const jm = (await mRes.json()) as { stations?: { status?: string }[] }
        const stations = Array.isArray(jm.stations) ? jm.stations : []
        setLiveStations({
          total: stations.length,
          active: stations.filter((s) => s.status === 'active').length,
        })
      } else {
        setLiveStations(null)
      }
    } catch {
      setLiveLoadErr('Some live data could not be refreshed. Showing reference data where needed.')
      setLiveBudget(null)
      setFinanceReqs(null)
      setLiveStations(null)
    }
  }, [])

  useEffect(() => {
    void loadReadingsCount()
  }, [loadReadingsCount])

  useEffect(() => {
    void loadLiveHub()
  }, [loadLiveHub])

  const hydroBudgetErp = useMemo(
    () => data.programmeBudgetLines.filter((bl) => bl.department === 'hydrological'),
    [data.programmeBudgetLines]
  )
  const hydroReqsErp = useMemo(
    () => data.requisitions.filter((r) => r.department === 'hydrological'),
    [data.requisitions]
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
    return hydroBudgetErp
  }, [liveBudget, hydroBudgetErp])

  const totalAllocated = useMemo(
    () =>
      liveBudget && liveBudget.lines.length > 0 ?
        liveBudget.totals.totalAllocated
      : hydroBudgetErp.reduce((sum, bl) => sum + bl.allocatedAmount, 0),
    [liveBudget, hydroBudgetErp]
  )
  const totalUtilized = useMemo(
    () =>
      liveBudget && liveBudget.lines.length > 0 ?
        liveBudget.totals.totalUtilized
      : hydroBudgetErp.reduce((sum, bl) => sum + bl.utilizedAmount, 0),
    [liveBudget, hydroBudgetErp]
  )
  const utilizationPercent =
    totalAllocated > 0 ? Math.round((totalUtilized / totalAllocated) * 100) : 0

  const recentRequisitions = useMemo((): RecentReq[] => {
    const fromFinance: RecentReq[] = (financeReqs ?? []).map((r) => ({
      id: `fin-${r.id}`,
      requesterName: r.requestedBy,
      narrative: r.description?.trim() ? `${r.title} — ${r.description}` : r.title,
      amount: r.amount,
      status: r.status,
      createdAt: new Date(r.createdAt),
    }))
    const fromErp: RecentReq[] = hydroReqsErp.map((r) => ({
      id: r.id,
      requesterName: r.requesterName,
      narrative: r.narrative,
      amount: r.amount,
      status: r.status,
      createdAt: r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt),
    }))
    return [...fromFinance, ...fromErp]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
  }, [financeReqs, hydroReqsErp])

  const statCards = useMemo(() => {
    const base = buildHydrologicalHubStatCards(dashboardSlices, liveReadingCount).filter((c) =>
      staffCanAccessHydroPath(user, c.href),
    )
    const erpHydroReqCount = hydroReqsErp.length
    const finCount = financeReqs?.length ?? null
    const totalReqCount =
      finCount !== null ? finCount + erpHydroReqCount : erpHydroReqCount

    const pendingErp = hydroReqsErp.filter((r) => isPendingStatus(r.status)).length
    const pendingFin = (financeReqs ?? []).filter((r) => isPendingStatus(r.status)).length
    const pendingTotal = finCount !== null ? pendingFin + pendingErp : pendingErp

    return base.map((card) => {
      if (card.title === 'Total budget' && liveBudget && liveBudget.lines.length > 0) {
        const v = liveBudget.totals.totalAllocated
        return {
          ...card,
          value: v,
          valueDisplay: formatCurrency(v),
        }
      }
      if (card.title === 'Flood forecasting' && liveStations) {
        const { total, active } = liveStations
        const offline = total - active
        return {
          ...card,
          value: total,
          change:
            offline === 0 ?
              `${active} active`
            : `${active} active · ${offline} offline`,
          trend: offline > 0 ? ('down' as const) : ('neutral' as const),
        }
      }
      if (card.title === 'Total requisitions' && finCount !== null) {
        return {
          ...card,
          value: totalReqCount,
        }
      }
      if (card.title === 'Pending (hydro)' && finCount !== null) {
        return {
          ...card,
          value: pendingTotal,
        }
      }
      return card
    })
  }, [dashboardSlices, liveReadingCount, user, liveBudget, liveStations, financeReqs, hydroReqsErp])

  const refreshAll = useCallback(() => {
    void loadReadingsCount()
    void loadLiveHub()
  }, [loadReadingsCount, loadLiveHub])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Hydrological department</h1>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void refreshAll()}>
          Refresh data
        </Button>
      </div>

      {liveLoadErr ? (
        <p className="text-sm text-amber-700 dark:text-amber-400" role="status">
          {liveLoadErr}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {stat.valueDisplay ?? stat.value.toLocaleString()}
              </div>
              {stat.change ? (
                <div className="flex items-center gap-1 text-xs">
                  {stat.trend === 'up' && <TrendingUp className="h-3 w-3 text-secondary" />}
                  {stat.trend === 'down' && <TrendingDown className="h-3 w-3 text-destructive" />}
                  <span
                    className={stat.trend === 'down' ? 'text-destructive' : 'text-muted-foreground'}
                  >
                    {stat.change}
                  </span>
                </div>
              ) : null}
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
                {liveBudget && liveBudget.lines.length > 0 ?
                  'Live allocation from Finance programme budgets'
                : 'FY hydrological allocation and utilization (reference data if no finance lines)'}
              </CardDescription>
            </div>
            {staffCanAccessHydroPath(user, '/hydrological/budget') ? (
              <Link href="/hydrological/budget">
                <Button variant="outline" size="sm">
                  Open budget
                </Button>
              </Link>
            ) : (
              <span className="text-muted-foreground text-xs">Open budget — restricted</span>
            )}
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
                  No hydrological programme lines yet. Finance can add them under Finance → Budgets (department:
                  Hydrological).
                </p>
              ) : (
                budgetLinesForOverview.map((bl) => {
                  const alloc = bl.allocatedAmount
                  const util = Math.min(bl.utilizedAmount, alloc)
                  const utilization = alloc > 0 ? Math.round((util / alloc) * 100) : 0
                  return (
                    <div key={bl.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {bl.programmeCode}
                          </Badge>
                          <span className="text-sm font-medium">{bl.programmeName}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{utilization}%</span>
                      </div>
                      <Progress value={utilization} className="h-1.5" />
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Department actions</CardTitle>
            <CardDescription>Jump to operational tools</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {staffCanAccessHydroPath(user, '/hydrological/readings') ? (
              <Link href="/hydrological/readings">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Recordings &amp; validation
                </Button>
              </Link>
            ) : null}
            {staffCanAccessHydroPath(user, '/hydrological/monitoring') ? (
              <Link href="/hydrological/monitoring">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <MapPin className="h-4 w-4" />
                  Flood forecasting
                </Button>
              </Link>
            ) : null}
            {staffCanAccessHydroPath(user, '/hydrological/budget/requisitions') ? (
              <Link href="/hydrological/budget/requisitions">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <FileText className="h-4 w-4" />
                  Budget requisitions
                </Button>
              </Link>
            ) : null}
            {staffCanAccessHydroPath(user, '/hydrological/budget/reports') ? (
              <Link href="/hydrological/budget/reports">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <ScrollText className="h-4 w-4" />
                  Departmental report
                </Button>
              </Link>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent hydrological requisitions</CardTitle>
            <CardDescription>Finance store and ERP budget requests for this department</CardDescription>
          </div>
          {staffCanAccessHydroPath(user, '/hydrological/budget/requisitions') ? (
            <Link href="/hydrological/budget/requisitions">
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          ) : null}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentRequisitions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No requisitions yet. Create them from requisitions workflows or Finance → Requisitions.
              </p>
            ) : (
              recentRequisitions.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{req.requesterName}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{req.narrative}</p>
                    <span className="text-xs text-muted-foreground">{formatDate(req.createdAt)}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(req.amount)}</p>
                    <Badge className={getStatusColor(req.status)}>
                      {requisitionStatusLabels[req.status] ?? req.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
