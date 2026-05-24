'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, PieChart, RefreshCw, Wallet } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, departmentNames, requisitionStatusLabels } from '@/lib/mock-data'
import { resolvedApiUrl } from '@/lib/apiBase'

type SummaryPayload = {
  totalAllocated: number
  totalUtilized: number
  utilizationRate: number
  pendingApprovals: number
  requisitionsByStatus: { status: string; count: number; totalAmount: number }[]
  budgetByDepartment: { department: string; allocated: number; utilized: number }[]
}

function departmentLabel(key: string) {
  return departmentNames[key] ?? key
}

function statusLabel(status: string) {
  return requisitionStatusLabels[status] ?? status.replace(/_/g, ' ')
}

export default function FinanceSummaryPage() {
  const [data, setData] = useState<SummaryPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(resolvedApiUrl('/api/finance/summary'), { credentials: 'include' })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        const msg =
          body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
            ? body.error
            : `Failed to load summary (${res.status})`
        throw new Error(msg)
      }
      setData(body as SummaryPayload)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load summary')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const utilizationPct = data ? Math.min(100, Math.max(0, data.utilizationRate)) : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Finance summary</h1>
          <p className="text-muted-foreground">
            Consolidated budgets and requisitions from the finance store
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-destructive">Could not load summary</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total allocated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {loading || !data ? '—' : formatCurrency(data.totalAllocated)}
              </span>
              <Wallet className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Utilized</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading || !data ? '—' : formatCurrency(data.totalUtilized)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Utilization rate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading || !data ? (
              <span className="text-2xl font-bold">—</span>
            ) : (
              <>
                <Progress value={utilizationPct} className="h-2" />
                <p className="text-sm text-muted-foreground">{utilizationPct.toFixed(1)}%</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{loading || !data ? '—' : data.pendingApprovals}</span>
              <PieChart className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Requisitions in HOD / admin / DG review</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Budget by department</CardTitle>
            <CardDescription>Allocated vs utilized programme budgets</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading…
              </div>
            ) : !data || data.budgetByDepartment.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No budget lines yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Allocated</TableHead>
                    <TableHead className="text-right">Utilized</TableHead>
                    <TableHead className="w-[120px]">Use</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.budgetByDepartment.map((row) => {
                    const pct = row.allocated > 0 ? Math.min(100, (row.utilized / row.allocated) * 100) : 0
                    return (
                      <TableRow key={row.department}>
                        <TableCell>
                          <Badge variant="outline">{departmentLabel(row.department)}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(row.allocated)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.utilized)}</TableCell>
                        <TableCell>
                          <Progress value={pct} className="h-2" />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Requisitions by status</CardTitle>
            <CardDescription>Count and value across workflow stages</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading…
              </div>
            ) : !data || data.requisitionsByStatus.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No requisitions recorded.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.requisitionsByStatus.map((row) => (
                    <TableRow key={row.status}>
                      <TableCell>{statusLabel(row.status)}</TableCell>
                      <TableCell className="text-right">{row.count}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(row.totalAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
