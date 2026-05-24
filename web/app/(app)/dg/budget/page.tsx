'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { resolvedApiUrl } from '@/lib/apiBase'
import { mergeDeptStatsForDgOverview } from '@/lib/orgDepartments'
import {
  DG_FISCAL_YEAR_DISPLAY,
  filterFundedExecutiveCards,
  mergeDeptStatsForExecutiveOverview,
} from '@/lib/dg-budget-presentation'
import {
  DG_APPROVALS_REFETCH_MS,
  DG_BUDGET_OVERVIEW_QUERY_KEY,
} from '@/lib/dgQueryKeys'
import { useSessionUser } from '@/components/demo-session-provider'
import type { BudgetOverview } from '@/components/dg/budget-overview/dg-budget-types'
import { DgBudgetPageHeader } from '@/components/dg/budget-overview/dg-budget-page-header'
import { DgBudgetKpiGrid } from '@/components/dg/budget-overview/dg-budget-kpi-grid'
import { DgBudgetDeptGrid } from '@/components/dg/budget-overview/dg-budget-dept-card'
import { DgBudgetLinesTable } from '@/components/dg/budget-overview/dg-budget-lines-table'
import { DgBudgetEmptyState } from '@/components/dg/budget-overview/dg-budget-empty-state'

export default function DGBudgetOverviewPage() {
  const { user } = useSessionUser()
  const { data, isLoading } = useQuery<BudgetOverview>({
    queryKey: DG_BUDGET_OVERVIEW_QUERY_KEY,
    queryFn: async () => {
      const r = await fetch(resolvedApiUrl('/api/dg/budget-overview'), { credentials: 'include' })
      if (!r.ok) throw new Error('Failed to fetch')
      return r.json() as Promise<BudgetOverview>
    },
    refetchInterval: DG_APPROVALS_REFETCH_MS,
  })

  const overviewCards = useMemo(() => {
    if (!data) return []
    const canonical = mergeDeptStatsForDgOverview(data.departments)
    return filterFundedExecutiveCards(mergeDeptStatsForExecutiveOverview(canonical))
  }, [data])

  const fundedLines = useMemo(
    () => (data?.budgets ?? []).filter((b) => b.totalAmount > 0),
    [data?.budgets],
  )

  const criticalCount = overviewCards.filter((d) => d.utilizationRate > 85).length
  const fiscalLabel =
    fundedLines[0]?.fiscalYear ?? data?.budgets[0]?.fiscalYear ?? DG_FISCAL_YEAR_DISPLAY
  const hasBudgetData = (data?.totalAllocated ?? 0) > 0

  return (
    <div className="min-h-[calc(100dvh-4rem)] space-y-8 bg-zinc-100/95 px-4 pb-10 pt-px md:px-6 dark:bg-background">
      <DgBudgetPageHeader
        fiscalLabel={fiscalLabel}
        userName={user.name}
        userEmail={user.email}
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border border-zinc-200/80 bg-white dark:bg-zinc-900" />
          ))}
        </div>
      ) : data ? (
        <>
          <DgBudgetKpiGrid
            data={data}
            departmentCount={overviewCards.length}
            criticalCount={criticalCount}
          />

          {!hasBudgetData ? (
            <DgBudgetEmptyState />
          ) : (
            <>
              {overviewCards.length > 0 ? <DgBudgetDeptGrid cards={overviewCards} /> : null}
              {fundedLines.length > 0 ? (
                <DgBudgetLinesTable lines={fundedLines} fiscalLabel={fiscalLabel} />
              ) : null}
            </>
          )}
        </>
      ) : null}
    </div>
  )
}
