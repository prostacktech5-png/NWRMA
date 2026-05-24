'use client'

import { useState, useEffect, useRef } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatCard } from '@/components/StatCard'
import { StatusBadge } from '@/components/StatusBadge'
import { RequisitionDetailsDialog } from '@/components/RequisitionDetailsDialog'
import { DgHydrologicalIncentiveQueue } from '@/components/hydro/dg-incentive-queue'
import { useSessionUser } from '@/components/demo-session-provider'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  Wallet,
  Users,
  Droplets,
  TrendingUp,
  Radio,
  ChevronDown,
  ChevronUp,
  TriangleAlert,
  Info,
  BadgeAlert,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { resolvedApiUrl } from '@/lib/apiBase'
import {
  DG_APPROVALS_REFETCH_MS,
  DG_BUDGET_OVERVIEW_QUERY_KEY,
  FINANCE_SUMMARY_QUERY_KEY,
  FINANCE_REQUISITIONS_QUERY_KEY,
  HYDRO_PAYMENTS_QUERY_KEY,
  HR_LEAVE_REQUESTS_QUERY_KEY,
} from '@/lib/dgQueryKeys'
import { formatNLe } from '@/lib/formatLeone'
import {
  financeRequisitionProgressStages,
  financeRequisitionStageIndex,
  usesPettyCashDirectRouting,
} from '@/lib/finance-requisition-routing'

interface DGSummary {
  pendingApprovals: number
  requisitionsPendingDG: number
  totalPendingAmount: number
  pendingOfficerPayments: number
  pendingLeaveRequests: number
  /** Leave rows still awaiting HR HoD before they reach the DG */
  pendingLeaveAwaitingHrHod: number
  unconfirmedTestPayments: number
  reqsByStage: { hod: number; admin: number; dg: number; finance: number }
  budgetHealth: { totalAllocated: number; totalUtilized: number; utilizationRate: number }
}

interface DGPending {
  requisitions: Array<{
    id: number
    title: string
    requestedBy: string
    department: string
    amount: number
    status: string
    approvalRoute: string
    createdAt: string
    description: string
  }>
  officerPayments: Array<{
    id: string
    officerName: string
    month: string
    totalAmount: string
    validSubmissions: number
    status: string
  }>
  leaveRequests: Array<{
    id: string
    staffName: string
    type: string
    startDate: string
    endDate: string
    days: number
    reason: string
    status: string
  }>
}

interface Alert {
  id: string
  severity: 'critical' | 'warning' | 'info'
  type: 'budget_threshold' | 'pending_at_risk' | 'dg_action_required'
  department: string
  message: string
  detail: string
  value: number
  timestamp: string
}

interface AlertsResponse {
  alerts: Alert[]
  criticalCount: number
  warningCount: number
  infoCount: number
  lastUpdated: string
}

type Tab = 'requisitions' | 'payments' | 'leave'

function useApiQuery<T>(path: string, queryKey: readonly unknown[]) {
  return useQuery<T>({
    queryKey: [...queryKey],
    queryFn: async () => {
      const r = await fetch(resolvedApiUrl(`/api/${path}`), { credentials: 'include' })
      if (!r.ok) throw new Error('Failed to fetch')
      return r.json() as Promise<T>
    },
    refetchInterval: DG_APPROVALS_REFETCH_MS,
  })
}

const stageLabel: Record<string, string> = {
  hod_review: 'Awaiting HOD',
  admin_review: 'Awaiting HR & Admin approval',
  dg_review: 'Awaiting DG sign-off',
  finance_review: 'Finance settlement',
}

const SEV = {
  critical: {
    icon: TriangleAlert,
    bar: 'bg-red-500',
    badge: 'bg-red-100 border-red-300 text-red-700',
    card: 'border-red-200 bg-red-50/60',
    dot: 'bg-red-500',
    text: 'text-red-700',
    label: 'CRITICAL',
  },
  warning: {
    icon: BadgeAlert,
    bar: 'bg-amber-500',
    badge: 'bg-amber-100 border-amber-300 text-amber-700',
    card: 'border-amber-200 bg-amber-50/60',
    dot: 'bg-amber-500',
    text: 'text-amber-700',
    label: 'WARNING',
  },
  info: {
    icon: Info,
    bar: 'bg-blue-500',
    badge: 'bg-blue-100 border-blue-300 text-blue-700',
    card: 'border-blue-200 bg-blue-50/60',
    dot: 'bg-blue-400',
    text: 'text-blue-700',
    label: 'INFO',
  },
} as const

const TYPE_LABEL: Record<Alert['type'], string> = {
  budget_threshold: 'Budget Threshold',
  pending_at_risk: 'Funds at Risk',
  dg_action_required: 'Action Required',
}

function AlertTicker({ alerts }: { alerts: Alert[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)

  if (alerts.length === 0) return null

  const items = [...alerts, ...alerts]

  return (
    <div
      className="relative flex h-9 select-none items-center overflow-hidden rounded-lg border border-slate-800 bg-slate-900"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      data-testid="alert-ticker"
    >
      <div className="flex h-full flex-shrink-0 items-center gap-1.5 border-r border-slate-700 bg-slate-800/80 px-3">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
        <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-slate-300">
          Live Alerts
        </span>
      </div>

      <div className="flex-1 overflow-hidden">
        <div
          ref={trackRef}
          className={cn('flex items-center gap-0 whitespace-nowrap', !paused && 'animate-ticker')}
          style={
            !paused
              ? { animation: `ticker ${Math.max(items.length * 6, 20)}s linear infinite` }
              : {}
          }
        >
          {items.map((alert, i) => {
            const cfg = SEV[alert.severity]
            return (
              <span key={`${alert.id}-${i}`} className="inline-flex items-center gap-2 px-5">
                <span className={cn('inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full', cfg.dot)} />
                <span className={cn('text-[10px] font-bold uppercase tracking-wide', cfg.text)}>
                  {alert.department}
                </span>
                <span className="text-xs text-slate-300">{alert.message}</span>
                <span className="mx-1 text-slate-600">·</span>
              </span>
            )
          })}
        </div>
      </div>

      {paused ? (
        <div className="absolute right-0 top-0 bottom-0 flex items-center bg-slate-900/90 px-3 text-[10px] text-slate-400">
          Paused
        </div>
      ) : null}
    </div>
  )
}

function AlertCard({ alert }: { alert: Alert }) {
  const cfg = SEV[alert.severity]
  const Icon = cfg.icon

  return (
    <div data-testid={`alert-card-${alert.id}`} className={cn('flex gap-3 rounded-lg border p-4', cfg.card)}>
      <div className={cn('mt-0.5 h-5 w-5 flex-shrink-0', cfg.text)}>
        <Icon className="h-full w-full" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex flex-wrap items-center gap-2">
          <span
            className={cn('rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest', cfg.badge)}
          >
            {cfg.label}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {TYPE_LABEL[alert.type]}
          </span>
          <span className="text-sm font-semibold">{alert.department}</span>
        </div>
        <p className="text-sm font-medium">{alert.message}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{alert.detail}</p>
      </div>
    </div>
  )
}

function DgApprovalsCentreBody() {
  const { actingUserHeaders } = useSessionUser()
  const [tab, setTab] = useState<Tab>('requisitions')
  const [alertsExpanded, setAlertsExpanded] = useState(true)
  const tickSec = Math.max(4, Math.ceil(DG_APPROVALS_REFETCH_MS / 1000))
  const [countdown, setCountdown] = useState(tickSec)
  const queryClient = useQueryClient()

  const { data: summary, isLoading: summaryLoading, dataUpdatedAt: summaryUpdated } =
    useApiQuery<DGSummary>('dg/summary', ['dg-summary'])
  const { data: pending, isLoading: pendingLoading, dataUpdatedAt: pendingUpdated } = useApiQuery<DGPending>(
    'dg/pending-approvals',
    ['dg-pending']
  )
  const { data: alertsData, isLoading: alertsLoading, dataUpdatedAt: alertsUpdated } =
    useApiQuery<AlertsResponse>('dg/alerts', ['dg-alerts'])

  const refreshPulse = Math.max(summaryUpdated ?? 0, pendingUpdated ?? 0, alertsUpdated ?? 0)

  useEffect(() => {
    setCountdown(tickSec)
    const interval = setInterval(() => {
      setCountdown((c) => (c <= 1 ? tickSec : c - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [refreshPulse, tickSec])

  function invalidateDgQueries() {
    void queryClient.invalidateQueries({ queryKey: ['dg-summary'] })
    void queryClient.invalidateQueries({ queryKey: ['dg-pending'] })
    void queryClient.invalidateQueries({ queryKey: ['dg-alerts'] })
    void queryClient.invalidateQueries({ queryKey: [...FINANCE_SUMMARY_QUERY_KEY] })
    void queryClient.invalidateQueries({ queryKey: [...FINANCE_REQUISITIONS_QUERY_KEY] })
    void queryClient.invalidateQueries({ queryKey: [...HYDRO_PAYMENTS_QUERY_KEY] })
    void queryClient.invalidateQueries({ queryKey: [...HR_LEAVE_REQUESTS_QUERY_KEY] })
    void queryClient.invalidateQueries({ queryKey: [...DG_BUDGET_OVERVIEW_QUERY_KEY] })
  }

  const approveReq = useMutation({
    mutationFn: async (vars: { id: number; action: 'approve' | 'reject'; comment?: string }) => {
      const r = await fetch(resolvedApiUrl(`/api/finance/requisitions/${vars.id}/approve`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: vars.action,
          comment: vars.comment ?? null,
        }),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? 'Request failed')
      }
      return r.json()
    },
    onSuccess: invalidateDgQueries,
  })

  const approvePayment = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(resolvedApiUrl(`/api/hydrological/payments/${encodeURIComponent(id)}/approve`), {
        method: 'POST',
        headers: { ...actingUserHeaders },
        credentials: 'include',
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? 'Request failed')
      }
      return r.json()
    },
    onSuccess: invalidateDgQueries,
  })

  const disbursePayment = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(resolvedApiUrl(`/api/hydrological/payments/${encodeURIComponent(id)}/disburse`), {
        method: 'POST',
        headers: { ...actingUserHeaders },
        credentials: 'include',
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? 'Request failed')
      }
      return r.json()
    },
    onSuccess: invalidateDgQueries,
  })

  const approveLeave = useMutation({
    mutationFn: async (vars: { id: string; action: 'approve' | 'reject' }) => {
      const r = await fetch(
        resolvedApiUrl(`/api/dg/leave/${encodeURIComponent(vars.id)}/decision`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ action: vars.action }),
        }
      )
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? 'Request failed')
      }
      return r.json()
    },
    onSuccess: invalidateDgQueries,
  })

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'requisitions', label: 'Requisitions', count: pending?.requisitions.length ?? 0 },
    { id: 'payments', label: 'Officer Payments', count: pending?.officerPayments.length ?? 0 },
    { id: 'leave', label: 'Leave Requests', count: pending?.leaveRequests.length ?? 0 },
  ]

  const alerts = alertsData?.alerts ?? []
  const criticalCount = alertsData?.criticalCount ?? 0
  const warningCount = alertsData?.warningCount ?? 0

  return (
    <div className="space-y-5">
      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker { animation-timing-function: linear; animation-iteration-count: infinite; }
      `}</style>

      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15">
          <ShieldCheck className="h-6 w-6 text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Director General — Approvals Centre</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            All pending approvals across the organisation — requisitions, officer payments, and leave requests
          </p>
        </div>
      </div>

      {!alertsLoading ? <AlertTicker alerts={alerts} /> : null}

      {!alertsLoading && alerts.length > 0 ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <button
            data-testid="button-toggle-alerts"
            type="button"
            onClick={() => setAlertsExpanded((v) => !v)}
            className="flex w-full items-center justify-between px-5 py-3.5 transition-colors hover:bg-muted/40"
          >
            <div className="flex items-center gap-3">
              <Radio className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Budget Health Alerts</span>
              <div className="flex items-center gap-1.5">
                {criticalCount > 0 ? (
                  <span className="rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                    {criticalCount} critical
                  </span>
                ) : null}
                {warningCount > 0 ? (
                  <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                    {warningCount} warning
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                Refreshes in {countdown}s
              </span>
              {alertsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </button>

          {alertsExpanded ? (
            <div className="border-t border-border px-5 pb-5">
              <div className="grid gap-3 pt-4 md:grid-cols-2">
                {alerts.map((a) => (
                  <AlertCard key={a.id} alert={a} />
                ))}
              </div>
              {alertsData?.lastUpdated ? (
                <p className="mt-3 text-right text-[10px] text-muted-foreground">
                  Last updated: {new Date(alertsData.lastUpdated).toLocaleTimeString('en-GB')}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {!alertsLoading && alerts.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3.5">
          <CheckCircle className="h-4 w-4 flex-shrink-0 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-800">
            All budget lines healthy — no threshold breaches detected
          </span>
          <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600">
            <RefreshCw className="h-3 w-3" />
            Refreshes in {countdown}s
          </span>
        </div>
      ) : null}

      {summaryLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              title="Total Pending"
              value={summary.pendingApprovals}
              subtitle="Across all categories"
              icon={<Clock className="h-5 w-5" />}
              variant={summary.pendingApprovals > 0 ? 'warning' : 'default'}
            />
            <StatCard
              title="Awaiting DG Sign-off"
              value={summary.requisitionsPendingDG}
              subtitle={`${formatNLe(summary.totalPendingAmount)} total value`}
              icon={<ShieldCheck className="h-5 w-5" />}
              variant={summary.requisitionsPendingDG > 0 ? 'warning' : 'default'}
            />
            <StatCard
              title="Officer Payments"
              value={summary.pendingOfficerPayments}
              subtitle="Pending disbursement"
              icon={<Droplets className="h-5 w-5" />}
            />
            <StatCard
              title="Leave Requests"
              value={summary.pendingLeaveRequests}
              subtitle="DG gate · after HR HoD"
              icon={<Users className="h-5 w-5" />}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-card p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Requisition Approval Pipeline
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'HOD Review', count: summary.reqsByStage.hod, color: 'bg-amber-500' },
                  { label: 'HR & Admin', count: summary.reqsByStage.admin, color: 'bg-blue-500' },
                  { label: 'DG Sign-off', count: summary.reqsByStage.dg, color: 'bg-purple-500' },
                  { label: 'Finance settlement', count: summary.reqsByStage.finance, color: 'bg-emerald-600' },
                ].map((stage) => (
                  <div
                    key={stage.label}
                    data-testid={`pipeline-${stage.label.replace(/\s+/g, '-').toLowerCase()}`}
                    className="flex items-center gap-3"
                  >
                    <div className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${stage.color}`} />
                    <span className="flex-1 text-sm">{stage.label}</span>
                    <span
                      className={cn(
                        'text-sm font-bold tabular-nums',
                        stage.count > 0 ? 'text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {stage.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                Organisational Budget Health
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Allocated</span>
                  <span className="font-semibold">{formatNLe(summary.budgetHealth.totalAllocated)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Utilized</span>
                  <span className="font-semibold">{formatNLe(summary.budgetHealth.totalUtilized)}</span>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-muted-foreground">Utilization Rate</span>
                    <span className="font-semibold">{summary.budgetHealth.utilizationRate.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        summary.budgetHealth.utilizationRate > 90
                          ? 'bg-red-500'
                          : summary.budgetHealth.utilizationRate > 70
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(summary.budgetHealth.utilizationRate, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between border-t border-border pt-1 text-sm">
                  <span className="text-muted-foreground">Available Balance</span>
                  <span className="font-bold text-emerald-600">
                    {formatNLe(summary.budgetHealth.totalAllocated - summary.budgetHealth.totalUtilized)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      <div className="border-b border-border">
        <nav className="flex gap-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              data-testid={`tab-dg-${t.id}`}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                tab === t.id
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
              {t.count > 0 ? (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                    tab === t.id ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {t.count}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'requisitions' ? (
        <div className="space-y-3">
          {pendingLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
            ))
          ) : pending?.requisitions.length ? (
            pending.requisitions.map((r) => (
              <div
                key={r.id}
                data-testid={`dg-requisition-${r.id}`}
                className={cn(
                  'rounded-xl border bg-card p-5',
                  r.status === 'dg_review' ? 'border-amber-200' : ''
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{r.title}</p>
                      {r.status === 'dg_review' ? (
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600">
                          Requires DG Action
                        </span>
                      ) : null}
                    </div>
                    <p className="mb-2 text-sm text-muted-foreground">{r.description}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>
                        By <span className="font-medium text-foreground">{r.requestedBy}</span>
                      </span>
                      <span>
                        Dept: <span className="font-medium text-foreground">{r.department}</span>
                      </span>
                      <span>
                        Route:{' '}
                        <span
                          className={cn(
                            'font-medium',
                            usesPettyCashDirectRouting(r) ? 'text-amber-600' : 'text-blue-600'
                          )}
                        >
                          {usesPettyCashDirectRouting(r) ? 'Petty cash (≤500 SLE)' : 'Full approval chain'}
                        </span>
                      </span>
                      <span>Submitted: {new Date(r.createdAt).toLocaleDateString('en-GB')}</span>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end gap-3">
                    <p className="text-xl font-bold tabular-nums">{formatNLe(Number(r.amount))}</p>
                    <StatusBadge status={r.status} />
                    <RequisitionDetailsDialog req={r} />
                    {r.status === 'dg_review' ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          data-testid={`dg-approve-req-${r.id}`}
                          onClick={() => approveReq.mutate({ id: r.id, action: 'approve' })}
                          disabled={approveReq.isPending}
                          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Approve
                        </button>
                        <button
                          type="button"
                          data-testid={`dg-reject-req-${r.id}`}
                          onClick={() =>
                            approveReq.mutate({
                              id: r.id,
                              action: 'reject',
                              comment: 'Rejected by Director General',
                            })
                          }
                          disabled={approveReq.isPending}
                          className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      </div>
                    ) : (
                      <p className="max-w-[11rem] text-right text-[10px] leading-snug text-muted-foreground">
                        {r.status === 'hod_review'
                          ? 'Pending departmental HoD — DG cannot advance yet.'
                          : r.status === 'admin_review'
                            ? 'Pending HR & Admin approval — DG cannot advance yet.'
                            : r.status === 'finance_review'
                              ? usesPettyCashDirectRouting(r)
                                ? 'Finance petty-cash queue — DG bypassed after HoD.'
                                : 'Finance settlement — released after DG.'
                              : null}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground">{stageLabel[r.status] ?? r.status}</p>
                  <div className="mt-1.5 flex gap-1">
                    {(() => {
                      const stages = financeRequisitionProgressStages(r)
                      const currentIdx = financeRequisitionStageIndex(r.status, stages)
                      return stages.map((s, i) => (
                        <div
                          key={`${r.id}-${s}-${i}`}
                          title={s.replace(/_/g, ' ')}
                          className="flex min-w-0 flex-1 items-center"
                        >
                          <div
                            className={cn(
                              'h-1.5 min-w-[0.75rem] flex-1 rounded-full',
                              i <= currentIdx ? 'bg-amber-500' : 'bg-muted'
                            )}
                          />
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border bg-card p-12 text-center">
              <CheckCircle className="mx-auto mb-3 h-8 w-8 text-emerald-500" />
              <p className="font-medium">No pending requisitions</p>
              <p className="mt-1 text-sm text-muted-foreground">All requisitions have been processed</p>
            </div>
          )}
        </div>
      ) : null}

      {tab === 'payments' ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Officer</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Month</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Submissions</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pendingLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 animate-pulse rounded bg-muted" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : pending?.officerPayments.length ? (
                  pending.officerPayments.map((p) => (
                    <tr key={p.id} data-testid={`dg-payment-${p.id}`} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{p.officerName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.month}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{p.validSubmissions}</td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums">
                        {formatNLe(Number(p.totalAmount))}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3">
                        {p.status === 'submitted' ? (
                          <button
                            type="button"
                            data-testid={`dg-approve-payment-${p.id}`}
                            onClick={() => approvePayment.mutate(p.id)}
                            disabled={approvePayment.isPending}
                            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Approve
                          </button>
                        ) : null}
                        {p.status === 'approved' ? (
                          <button
                            type="button"
                            data-testid={`dg-disburse-payment-${p.id}`}
                            onClick={() => disbursePayment.mutate(p.id)}
                            disabled={disbursePayment.isPending}
                            className="flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-50"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Disburse
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      No pending officer payments
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === 'leave' ? (
        <div className="space-y-3">
          {pendingLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
            ))
          ) : pending?.leaveRequests.length ? (
            pending.leaveRequests.map((l) => (
              <div
                key={l.id}
                data-testid={`dg-leave-${l.id}`}
                className="flex items-center gap-4 rounded-xl border bg-card p-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <p className="font-semibold">{l.staffName}</p>
                    <StatusBadge status={l.type} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {l.startDate} to {l.endDate} &mdash; {l.days} day(s)
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{l.reason}</p>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                  <button
                    type="button"
                    data-testid={`dg-approve-leave-${l.id}`}
                    onClick={() => approveLeave.mutate({ id: l.id, action: 'approve' })}
                    disabled={approveLeave.isPending}
                    className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Approve
                  </button>
                  <button
                    type="button"
                    data-testid={`dg-reject-leave-${l.id}`}
                    onClick={() => approveLeave.mutate({ id: l.id, action: 'reject' })}
                    disabled={approveLeave.isPending}
                    className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Reject
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border bg-card p-12 text-center">
              <CheckCircle className="mx-auto mb-3 h-8 w-8 text-emerald-500" />
              <p className="font-medium">No leave at DG gate</p>
              <p className="mt-1 text-sm text-muted-foreground">
                New requests appear here only after HR Head of Department endorses them.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

export default function DGDashboardPage() {
  const [workspace, setWorkspace] = useState<'centre' | 'hydro'>('centre')

  return (
    <Tabs value={workspace} onValueChange={(v) => setWorkspace(v as 'centre' | 'hydro')} className="space-y-6">
      <TabsList className="grid w-full max-w-lg grid-cols-2 sm:w-auto sm:inline-flex">
        <TabsTrigger value="centre">Approvals centre</TabsTrigger>
        <TabsTrigger value="hydro">Hydrological incentives</TabsTrigger>
      </TabsList>
      <TabsContent value="centre" className="mt-0 outline-none">
        <DgApprovalsCentreBody />
      </TabsContent>
      <TabsContent value="hydro" className="mt-0 outline-none">
        <DgHydrologicalIncentiveQueue />
      </TabsContent>
    </Tabs>
  )
}
