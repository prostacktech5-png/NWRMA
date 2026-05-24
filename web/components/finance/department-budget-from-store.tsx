'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatCard } from '@/components/hydro/stat-card'
import { formatNLe } from '@/lib/mock-data'
import { resolvedApiUrl } from '@/lib/apiBase'

export type DepartmentBudgetLineJson = {
  id: number
  budgetCode: string
  department: string
  project: string
  source: string
  totalAmount: number
  utilizedAmount: number
  availableBalance: number
  fiscalYear: string
  createdAt: string
}

type DepartmentBudgetPayload = {
  source: string
  department: string
  lines: DepartmentBudgetLineJson[]
  totals: {
    totalAllocated: number
    totalUtilized: number
    totalAvailable: number
  }
}

type Props = {
  /** Canonical department key — must match Finance → Budgets department values */
  departmentKey: string
  title: string
  subtitle?: string
}

export function DepartmentBudgetFromStore({ departmentKey, title, subtitle }: Props) {
  const [data, setData] = useState<DepartmentBudgetPayload | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const q = new URLSearchParams({ department: departmentKey })
      const res = await fetch(resolvedApiUrl(`/api/finance/department-budget?${q}`), {
        credentials: 'include',
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        const msg =
          json && typeof json === 'object' && 'error' in json && typeof json.error === 'string'
            ? json.error
            : `Could not load budget (${res.status})`
        throw new Error(msg)
      }
      setData(json as DepartmentBudgetPayload)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load budget data.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [departmentKey])

  useEffect(() => {
    void load()
  }, [load])

  const lines = data?.lines ?? []
  const totalAllocated = data?.totals.totalAllocated ?? 0
  const totalUtilized = data?.totals.totalUtilized ?? 0
  const availableBalance = data?.totals.totalAvailable ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-muted-foreground">{subtitle}</p> : null}
      </div>

      {err ? (
        <p className="text-sm text-destructive" role="alert">
          {err}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Allocated"
          value={!loading && data ? formatNLe(totalAllocated) : loading ? '…' : '—'}
        />
        <StatCard
          title="Total Utilized"
          value={!loading && data ? formatNLe(totalUtilized) : loading ? '…' : '—'}
        />
        <StatCard
          title="Available Balance"
          value={!loading && data ? formatNLe(availableBalance) : loading ? '…' : '—'}
          className="border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Programme budget lines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Programme</TableHead>
                  <TableHead className="whitespace-nowrap">FY</TableHead>
                  <TableHead className="text-right">Allocated</TableHead>
                  <TableHead className="text-right">Utilized</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No budget lines yet. Ask Finance to add a programme budget for this department.
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-mono text-sm font-medium">{l.budgetCode}</TableCell>
                      <TableCell className="font-medium">{l.project}</TableCell>
                      <TableCell className="text-muted-foreground">{l.fiscalYear}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNLe(l.totalAmount)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatNLe(l.utilizedAmount)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatNLe(l.availableBalance)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
