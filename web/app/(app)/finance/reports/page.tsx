'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Wallet,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate, departmentNames } from '@/lib/mock-data'
import { resolvedApiUrl } from '@/lib/apiBase'

type BudgetRow = {
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

type FundingOverview = {
  fiscalYear: string
  receipts: { id: number; fiscalYear: string; amount: number; reference: string | null; recordedAt: string }[]
  totalReceived: number
  totalAllocated: number
  totalUtilized: number
  unallocated: number
  receiptCount: number
}

function departmentLabel(key: string) {
  return departmentNames[key] ?? key
}

function budgetsToCsv(rows: BudgetRow[]): string {
  const header = [
    'id',
    'budgetCode',
    'department',
    'project',
    'source',
    'totalAmount',
    'utilizedAmount',
    'availableBalance',
    'fiscalYear',
    'createdAt',
  ]
  const esc = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [
    header.join(','),
    ...rows.map((r) =>
      [
        r.id,
        r.budgetCode,
        r.department,
        r.project,
        r.source,
        r.totalAmount,
        r.utilizedAmount,
        r.availableBalance,
        r.fiscalYear,
        r.createdAt,
      ]
        .map(esc)
        .join(',')
    ),
  ]
  return lines.join('\n')
}

export default function FinanceReportsPage() {
  const [fiscalYear, setFiscalYear] = useState('2024/25')
  const [overview, setOverview] = useState<FundingOverview | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [overviewError, setOverviewError] = useState<string | null>(null)

  const [budgets, setBudgets] = useState<BudgetRow[]>([])
  const [budgetsLoading, setBudgetsLoading] = useState(true)
  const [budgetsError, setBudgetsError] = useState<string | null>(null)

  const loadBudgets = useCallback(async () => {
    setBudgetsLoading(true)
    setBudgetsError(null)
    try {
      const res = await fetch(resolvedApiUrl('/api/finance/budgets'), { credentials: 'include' })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const msg =
          data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
            ? data.error
            : `Failed to load budgets (${res.status})`
        throw new Error(msg)
      }
      setBudgets(Array.isArray(data) ? (data as BudgetRow[]) : [])
    } catch (e) {
      setBudgetsError(e instanceof Error ? e.message : 'Failed to load budgets')
      setBudgets([])
    } finally {
      setBudgetsLoading(false)
    }
  }, [])

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true)
    setOverviewError(null)
    try {
      const q = encodeURIComponent(fiscalYear.trim())
      const res = await fetch(
        resolvedApiUrl(`/api/finance/funding-overview?fiscalYear=${q}`),
        { credentials: 'include' }
      )
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const msg =
          data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
            ? data.error
            : `Failed to load funding overview (${res.status})`
        throw new Error(msg)
      }
      setOverview(data as FundingOverview)
    } catch (e) {
      setOverviewError(e instanceof Error ? e.message : 'Failed to load funding overview')
      setOverview(null)
    } finally {
      setOverviewLoading(false)
    }
  }, [fiscalYear])

  useEffect(() => {
    void loadBudgets()
  }, [loadBudgets])

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  const downloadBudgetsCsv = () => {
    if (budgets.length === 0) return
    const blob = new Blob([budgetsToCsv(budgets)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finance-budget-lines-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const quickLinks = [
    { label: 'Budget lines', href: '/finance/budgets', icon: Wallet },
    { label: 'Requisitions', href: '/finance/requisitions', icon: FileText },
    { label: 'Summary', href: '/finance/summary', icon: BarChart3 },
  ] as const

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Finance reports</h1>
        <p className="text-muted-foreground">
          Funding overview by fiscal year and exports for programme budgets
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {quickLinks.map(({ label, href, icon: Icon }) => (
          <Button key={href} variant="outline" className="h-auto justify-between gap-2 py-4" asChild>
            <Link href={href}>
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {label}
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 opacity-60" />
            </Link>
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Funding overview</CardTitle>
            <CardDescription>Receipts vs allocations for the selected fiscal year</CardDescription>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="fy-input">Fiscal year</Label>
              <Input
                id="fy-input"
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)}
                className="w-40"
                placeholder="2024/25"
              />
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => void loadOverview()}
              disabled={overviewLoading}
            >
              <RefreshCw className={`h-4 w-4 ${overviewLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {overviewError ? (
            <p className="text-sm text-destructive" role="alert">
              {overviewError}
            </p>
          ) : null}
          {overviewLoading && !overview ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading overview…
            </div>
          ) : overview ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs font-medium text-muted-foreground">Total received</p>
                  <p className="mt-1 text-xl font-semibold">{formatCurrency(overview.totalReceived)}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs font-medium text-muted-foreground">Allocated (budgets)</p>
                  <p className="mt-1 text-xl font-semibold">{formatCurrency(overview.totalAllocated)}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs font-medium text-muted-foreground">Utilized</p>
                  <p className="mt-1 text-xl font-semibold">{formatCurrency(overview.totalUtilized)}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-xs font-medium text-muted-foreground">Unallocated</p>
                  <p className="mt-1 text-xl font-semibold">{formatCurrency(overview.unallocated)}</p>
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium">Receipts ({overview.receiptCount})</h3>
                {overview.receipts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No receipts recorded for this year.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Recorded</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overview.receipts.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {formatDate(new Date(r.recordedAt))}
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(r.amount)}</TableCell>
                          <TableCell>{r.reference ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Programme budgets export</CardTitle>
            <CardDescription>Download all budget lines as CSV for audits or spreadsheets</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={() => void loadBudgets()} disabled={budgetsLoading}>
              <RefreshCw className={`h-4 w-4 ${budgetsLoading ? 'animate-spin' : ''}`} />
              Reload
            </Button>
            <Button
              className="gap-2"
              onClick={downloadBudgetsCsv}
              disabled={budgetsLoading || budgets.length === 0}
            >
              <Download className="h-4 w-4" />
              Download CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {budgetsError ? (
            <p className="text-sm text-destructive" role="alert">
              {budgetsError}
            </p>
          ) : budgetsLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading budgets…
            </div>
          ) : budgets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No budget lines to export.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>FY</TableHead>
                  <TableHead className="text-right">Allocated</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgets.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-sm">{b.budgetCode}</TableCell>
                    <TableCell className="max-w-[180px] truncate">{b.project}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{departmentLabel(b.department)}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{b.fiscalYear}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(b.totalAmount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(b.availableBalance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
