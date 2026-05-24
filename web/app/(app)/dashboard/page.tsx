'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Droplets,
  TrendingUp,
  TrendingDown,
  FileText,
  Users,
  FlaskConical,
  Building2,
  ArrowRight,
  AlertTriangle,
  Waves,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  formatCurrency,
  formatDate,
  requisitionStatusLabels,
  labRequestStatusLabels,
  departmentNames,
} from '@/lib/mock-data'
import { useSessionUser } from '@/components/demo-session-provider'
import { reviveIsoDatesDeep } from '@/lib/erp-reference-serialize'
import type { LabRequest } from '@/lib/types'
import { useErpReference } from '@/components/reference-data-provider'
import {
  buildStatCards,
  getPriorityColor,
  getStatusColor,
  scopeBudgetLines,
  scopeLabRequests,
  scopeRequisitions,
} from '@/lib/dashboard-stats'
import { canSeeNavAccess, isOrgWideRole, notificationsForViewer, type NavAccess } from '@/lib/department-scope'
import { staffCanAccessHydroPath } from '@/lib/hydro-nav-access'
import type { LucideIcon } from 'lucide-react'

export default function DashboardPage() {
  const { user, actingUserHeaders } = useSessionUser()
  const { dashboardSlices, data } = useErpReference()
  const [liveReadingCount, setLiveReadingCount] = useState<number | null>(null)
  const [waterTestingLab, setWaterTestingLab] = useState<LabRequest[] | null>(null)

  const loadReadingsCount = useCallback(async () => {
    try {
      const res = await fetch('/api/hydrological/readings', { cache: 'no-store' })
      if (!res.ok) return
      const body = (await res.json()) as { readings?: unknown[] }
      setLiveReadingCount(Array.isArray(body.readings) ? body.readings.length : 0)
    } catch {
      setLiveReadingCount(null)
    }
  }, [])

  useEffect(() => {
    void loadReadingsCount()
  }, [loadReadingsCount])

  useEffect(() => {
    if (!isOrgWideRole(user) && user.department !== 'hydrological') {
      setWaterTestingLab(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/hydrological/water-testing/requests', {
          headers: { ...actingUserHeaders },
          credentials: 'same-origin',
        })
        if (!res.ok) return
        const json = (await res.json()) as { items?: unknown }
        if (!cancelled) {
          setWaterTestingLab(reviveIsoDatesDeep(json.items ?? []) as LabRequest[])
        }
      } catch {
        if (!cancelled) setWaterTestingLab(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, actingUserHeaders])

  const scopedReqs = useMemo(() => scopeRequisitions(user, dashboardSlices), [user, dashboardSlices])
  const scopedBudget = useMemo(() => scopeBudgetLines(user, dashboardSlices), [user, dashboardSlices])
  const scopedLabFromRef = useMemo(() => scopeLabRequests(user, dashboardSlices), [user, dashboardSlices])
  const scopedLab = useMemo(
    () => (waterTestingLab != null ? waterTestingLab : scopedLabFromRef),
    [waterTestingLab, scopedLabFromRef],
  )
  const scopedNotifications = useMemo(
    () => notificationsForViewer(user, data.notifications),
    [user, data.notifications]
  )

  const statCards = useMemo(
    () =>
      buildStatCards(
        user,
        scopedReqs,
        scopedLab,
        scopedBudget,
        dashboardSlices,
        liveReadingCount
      ),
    [user, scopedReqs, scopedLab, scopedBudget, dashboardSlices, liveReadingCount]
  )

  const recentRequisitions = scopedReqs.slice(0, 4)
  const recentLabRequests = scopedLab.slice(0, 3)
  const unreadNotifications = scopedNotifications.filter((n) => !n.read)

  const totalAllocated = scopedBudget.reduce((sum, bl) => sum + bl.allocatedAmount, 0)
  const totalUtilized = scopedBudget.reduce((sum, bl) => sum + bl.utilizedAmount, 0)
  const utilizationPercent =
    totalAllocated > 0 ? Math.round((totalUtilized / totalAllocated) * 100) : 0

  const quickActions = useMemo(() => {
    const items: { label: string; href: string; icon: LucideIcon; access: NavAccess }[] = [
      { label: 'New Requisition', href: '/finance/requisitions', icon: FileText, access: 'all' },
      { label: 'Record Reading', href: '/hydrological/readings', icon: Droplets, access: 'hydrological' },
      { label: 'Hydrological hub', href: '/hydrological', icon: Waves, access: 'hydrological' },
      { label: 'New Lab Request', href: '/hydrological/water-testing', icon: FlaskConical, access: 'hydrological' },
      { label: 'Register Borehole', href: '/boreholes/registry', icon: Building2, access: 'boreholes' },
      { label: 'Staff Directory', href: '/hr/staff', icon: Users, access: 'hr' },
    ]
    return items.filter((item) => {
      if (!canSeeNavAccess(user, item.access)) return false
      if (item.access === 'hydrological' && !staffCanAccessHydroPath(user, item.href)) return false
      return true
    })
  }, [user])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user.name.split(' ')[0]}. Here&apos;s what&apos;s happening today.
          </p>
        </div>
        <div className="flex h-2 w-24 overflow-hidden rounded-full">
          <div className="flex-1 bg-[#1EB53A]" />
          <div className="flex-1 border-y border-border bg-white" />
          <div className="flex-1 bg-[#0072C6]" />
        </div>
      </div>

      {unreadNotifications.length > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="flex items-center gap-4 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-warning-foreground" />
            <div className="flex-1">
              <p className="font-medium text-foreground">
                You have {unreadNotifications.length} unread notification
                {unreadNotifications.length > 1 ? 's' : ''}
              </p>
              <p className="text-sm text-muted-foreground">{unreadNotifications[0]?.message}</p>
            </div>
            <Button variant="outline" size="sm">
              View all
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              <div className="flex items-center gap-1 text-xs">
                {stat.trend === 'up' && <TrendingUp className="h-3 w-3 text-secondary" />}
                {stat.trend === 'down' && <TrendingDown className="h-3 w-3 text-destructive" />}
                <span className={stat.trend === 'down' ? 'text-destructive' : 'text-muted-foreground'}>
                  {stat.change}
                </span>
              </div>
              <Link
                href={stat.href}
                className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View details <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Budget Overview</CardTitle>
              <CardDescription>FY 2024 allocation and utilization (your scope)</CardDescription>
            </div>
            <Link href="/finance/budgets">
              <Button variant="outline" size="sm">
                View all
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
              {scopedBudget.length === 0 ? (
                <p className="text-sm text-muted-foreground">No budget lines in your department view.</p>
              ) : (
                scopedBudget.slice(0, 4).map((bl) => {
                  const utilization = Math.round((bl.utilizedAmount / bl.allocatedAmount) * 100)
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
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks for your access level</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {quickActions.map((a) => {
              const Icon = a.icon
              return (
                <Link key={a.href} href={a.href}>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Icon className="h-4 w-4" />
                    {a.label}
                  </Button>
                </Link>
              )
            })}
            {quickActions.length === 0 && (
              <p className="text-sm text-muted-foreground">No quick actions for this role.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Requisitions</CardTitle>
              <CardDescription>Latest budget requests (your scope)</CardDescription>
            </div>
            <Link href="/finance/requisitions">
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentRequisitions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No requisitions in this view.</p>
              ) : (
                recentRequisitions.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{req.requesterName}</p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">{req.narrative}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {req.department ? departmentNames[req.department] : 'N/A'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{formatDate(req.createdAt)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(req.amount)}</p>
                      <Badge className={getStatusColor(req.status)}>
                        {requisitionStatusLabels[req.status]}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {(isOrgWideRole(user) || user.department === 'hydrological') && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Water testing</CardTitle>
                <CardDescription>Water quality testing requests</CardDescription>
              </div>
              <Link href="/hydrological/water-testing">
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentLabRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No lab requests in this view.</p>
                ) : (
                  recentLabRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{req.reference}</p>
                          <Badge className={getPriorityColor(req.priority)}>{req.priority}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{req.requesterName}</p>
                        <p className="text-xs text-muted-foreground">{req.organisation}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(req.status)}>
                          {labRequestStatusLabels[req.status]}
                        </Badge>
                        <p className="mt-1 text-xs text-muted-foreground">{formatDate(req.receivedAt)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
