'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, Clock, Send, Wallet } from 'lucide-react'
import { StatCard } from '@/components/StatCard'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { resolvedApiUrl } from '@/lib/apiBase'
import { HYDRO_PAYMENTS_QUERY_KEY } from '@/lib/dgQueryKeys'
import { formatNLe } from '@/lib/formatLeone'
import {
  canApproveHydroPaymentsAsDg,
  canBulkSubmitHydroPaymentsToDg,
  canDisburseHydroPayments,
} from '@/lib/hydro-payment-policy'
import { useSessionUser } from '@/components/demo-session-provider'
import type { OfficerPaymentStatus } from '@/lib/types'

type PaymentRow = {
  id: string
  gaugeOfficerId: string
  officerName: string
  yearMonth: string
  validSubmissions: number
  rateSle: number
  totalSle: number
  status: OfficerPaymentStatus
  submittedAt: string | null
  approvedAt: string | null
  disbursedAt: string | null
}

type Metrics = {
  byStatus: Record<string, { count: number; amount: number }>
  awaitingDisbursement: { count: number; amount: number }
  submittedToDg: { count: number; amount: number }
}

type PaymentsQueryData = {
  payments: PaymentRow[]
  metrics: Metrics
}

const currentMonth = new Date().toISOString().slice(0, 7)

async function fetchHydroPaymentsPageData(): Promise<PaymentsQueryData> {
  const payRes = await fetch(resolvedApiUrl('/api/hydrological/payments'), { credentials: 'include' })
  if (!payRes.ok) throw new Error('Failed to load payments')
  const payJson = (await payRes.json()) as {
    payments: PaymentRow[]
    metrics: Metrics
  }
  return {
    payments: payJson.payments,
    metrics: payJson.metrics,
  }
}

export function OfficerPaymentsPage() {
  const { actingUserHeaders, user } = useSessionUser()
  const canBulkSubmitToDg = canBulkSubmitHydroPaymentsToDg(user)
  const canApprovePayments = canApproveHydroPaymentsAsDg(user)
  const canDisburseOfficerPayments = canDisburseHydroPayments(user)
  const [bulkMonth, setBulkMonth] = useState(currentMonth)
  const [bulkResult, setBulkResult] = useState<{ submitted: number; month: string } | null>(null)
  const bulkMonthTouched = useRef(false)
  const queryClient = useQueryClient()

  const { data, isLoading: paymentsLoading } = useQuery({
    queryKey: [...HYDRO_PAYMENTS_QUERY_KEY],
    queryFn: fetchHydroPaymentsPageData,
  })

  const payments = data?.payments ?? []
  const metrics = data?.metrics

  useEffect(() => {
    if (!payments.length || bulkMonthTouched.current) return
    const months = [...new Set(payments.map((p) => p.yearMonth))].sort()
    const latest = months[months.length - 1]
    if (!latest) return
    const hasCurrent = payments.some((p) => p.yearMonth === currentMonth)
    if (!hasCurrent && latest !== bulkMonth) {
      setBulkMonth(latest)
    }
  }, [payments, bulkMonth])

  const bulkSubmit = useMutation({
    mutationFn: async (month: string) => {
      const r = await fetch(resolvedApiUrl('/api/hydrological/payments/bulk-submit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...actingUserHeaders },
        body: JSON.stringify({ yearMonth: month }),
        credentials: 'include',
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        throw new Error(
          typeof (err as { error?: string }).error === 'string'
            ? (err as { error: string }).error
            : 'Bulk submit failed'
        )
      }
      return r.json() as Promise<{ submittedCount: number }>
    },
    onSuccess: (body, variables) => {
      setBulkResult({ submitted: body.submittedCount, month: variables })
      void queryClient.invalidateQueries({ queryKey: [...HYDRO_PAYMENTS_QUERY_KEY] })
      void queryClient.invalidateQueries({ queryKey: ['dg-summary'] })
      void queryClient.invalidateQueries({ queryKey: ['dg-pending'] })
    },
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
        throw new Error(
          typeof (err as { error?: string }).error === 'string'
            ? (err as { error: string }).error
            : 'Approve failed'
        )
      }
      return r.json()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...HYDRO_PAYMENTS_QUERY_KEY] })
      void queryClient.invalidateQueries({ queryKey: ['dg-summary'] })
      void queryClient.invalidateQueries({ queryKey: ['dg-pending'] })
    },
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
        throw new Error(
          typeof (err as { error?: string }).error === 'string'
            ? (err as { error: string }).error
            : 'Disburse failed'
        )
      }
      return r.json()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...HYDRO_PAYMENTS_QUERY_KEY] })
      void queryClient.invalidateQueries({ queryKey: ['dg-summary'] })
      void queryClient.invalidateQueries({ queryKey: ['dg-pending'] })
      void queryClient.invalidateQueries({ queryKey: ['finance-summary'] })
      void queryClient.invalidateQueries({ queryKey: ['dg-budget-overview'] })
    },
  })

  const pendingCount = metrics?.byStatus.pending.count ?? payments.filter((p) => p.status === 'pending').length
  const submittedCount =
    metrics?.byStatus.submitted.count ?? payments.filter((p) => p.status === 'submitted').length
  const approvedCount = metrics?.byStatus.approved.count ?? payments.filter((p) => p.status === 'approved').length
  const totalAmount = metrics
    ? Object.values(metrics.byStatus).reduce((s, x) => s + x.amount, 0)
    : payments.reduce((s, p) => s + Number(p.totalSle), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Officer Payments</h1>
        </div>
        <Button variant="outline" className="gap-2" asChild>
          <Link href="/dg">DG approvals centre</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          title="Pending"
          value={pendingCount}
          variant={pendingCount > 0 ? 'warning' : 'default'}
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard title="Submitted to DG" value={submittedCount} />
        <StatCard
          title="Approved"
          value={approvedCount}
          variant="success"
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <StatCard title="Total Amount" value={formatNLe(totalAmount)} icon={<Wallet className="h-5 w-5" />} />
      </div>

      <div className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Send className="h-4 w-4 text-muted-foreground" />
              HOD Bulk Submission to Director General
            </h3>
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="bulk-month">
                Month
              </label>
              <input
                id="bulk-month"
                type="month"
                data-testid="input-bulk-month"
                value={bulkMonth}
                onChange={(e) => {
                  bulkMonthTouched.current = true
                  setBulkMonth(e.target.value)
                  setBulkResult(null)
                }}
                className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
              />
            </div>
            <div className="mt-5">
              <button
                type="button"
                data-testid="button-bulk-submit"
                onClick={() => bulkSubmit.mutate(bulkMonth)}
                disabled={bulkSubmit.isPending || !bulkMonth || !canBulkSubmitToDg}
                className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {bulkSubmit.isPending ? 'Submitting…' : 'Submit to DG'}
              </button>
            </div>
          </div>
        </div>
        {bulkSubmit.isError ? (
          <p className="mt-3 text-sm text-destructive">{(bulkSubmit.error as Error).message}</p>
        ) : null}
        {bulkResult ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5">
            <CheckCircle className="h-4 w-4 flex-shrink-0 text-emerald-600" />
            <p className="text-sm font-medium text-emerald-800">
              {bulkResult.submitted === 0
                ? `No pending payments found for ${bulkResult.month} — all already submitted or none calculated yet.`
                : `${bulkResult.submitted} payment(s) for ${bulkResult.month} submitted to the Director General for approval.`}
            </p>
          </div>
        ) : null}
        {!canBulkSubmitToDg ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Only the Finance Head of Department or an administrator can submit payment batches to the
            Director General.
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Officer</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Month</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Valid Readings</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Rate</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paymentsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : payments.length > 0 ? (
                payments.map((p) => (
                  <tr key={p.id} data-testid={`row-payment-${p.id}`} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{p.officerName}</td>
                    <td className="px-4 py-3 font-mono text-xs">{p.yearMonth}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{p.validSubmissions}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {formatNLe(Number(p.rateSle))}/reading
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {formatNLe(Number(p.totalSle))}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3">
                      {canApprovePayments && p.status === 'submitted' ? (
                        <button
                          type="button"
                          data-testid={`button-approve-payment-${p.id}`}
                          onClick={() => approvePayment.mutate(p.id)}
                          disabled={approvePayment.isPending}
                          className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Approve
                        </button>
                      ) : null}
                      {canDisburseOfficerPayments && p.status === 'approved' ? (
                        <button
                          type="button"
                          data-testid={`button-disburse-payment-${p.id}`}
                          onClick={() => disbursePayment.mutate(p.id)}
                          disabled={disbursePayment.isPending}
                          className="rounded-md bg-sky-600 px-2 py-1 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-50"
                        >
                          Disburse
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    No payment records yet — validate readings first to generate payments
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
