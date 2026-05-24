'use client'

import type { ElementType, ReactNode } from 'react'
import { Wallet, PieChart, Users, Banknote } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNLeCompact } from '@/lib/formatLeone'
import type { BudgetOverview } from '@/components/dg/budget-overview/dg-budget-types'

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  variant = 'default',
  labelAdornment,
}: {
  label: string
  value: string | number
  sub?: string
  icon?: ElementType
  variant?: 'default' | 'success' | 'warning'
  labelAdornment?: ReactNode
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 rounded-2xl border bg-white p-5 shadow-sm dark:bg-card',
        variant === 'success' &&
          'border-emerald-200 bg-emerald-50/90 dark:border-emerald-800 dark:bg-emerald-950/30',
        variant === 'warning' &&
          'border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/25',
        variant === 'default' && 'border-zinc-200/80 dark:border-border',
      )}
    >
      <div className="min-w-0">
        <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {labelAdornment}
          {label}
        </p>
        <p
          className={cn(
            'text-3xl font-bold tracking-tight tabular-nums',
            variant === 'success' && 'text-emerald-700 dark:text-emerald-400',
          )}
        >
          {value}
        </p>
        {sub ? <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p> : null}
      </div>
      {Icon ? (
        <div
          className={cn(
            'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
            variant === 'success' &&
              'bg-emerald-100/80 text-emerald-700 ring-emerald-200/60 dark:bg-emerald-900/40 dark:text-emerald-400',
            variant === 'warning' &&
              'bg-amber-100/80 text-amber-800 ring-amber-200/60 dark:bg-amber-900/40 dark:text-amber-300',
            variant === 'default' &&
              'bg-zinc-100 text-zinc-600 ring-zinc-200/60 dark:bg-zinc-800 dark:text-zinc-400',
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
      ) : null}
    </div>
  )
}

export function DgBudgetKpiGrid({
  data,
  departmentCount,
  criticalCount,
}: {
  data: BudgetOverview
  departmentCount: number
  criticalCount: number
}) {
  const deptHealthy = criticalCount === 0

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiCard label="Total Allocated" value={formatNLeCompact(data.totalAllocated)} icon={Wallet} />
      <KpiCard
        label="Total Utilized"
        value={formatNLeCompact(data.totalUtilized)}
        sub={`${data.utilizationRate.toFixed(1)}% utilization`}
        icon={PieChart}
      />
      <KpiCard
        label="Available Balance"
        value={formatNLeCompact(data.totalAvailable)}
        icon={Banknote}
        variant="success"
      />
      <KpiCard
        label="Departments"
        value={departmentCount}
        sub={
          criticalCount > 0
            ? `${criticalCount} above 85% threshold`
            : '0 above 85% threshold'
        }
        icon={Users}
        variant={criticalCount > 0 ? 'warning' : 'default'}
        labelAdornment={
          deptHealthy ? (
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500"
              aria-hidden
            />
          ) : null
        }
      />
    </div>
  )
}
