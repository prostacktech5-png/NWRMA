'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, Loader2, Plus, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { resolvedApiUrl } from '@/lib/apiBase'
import { useSessionUser } from '@/components/demo-session-provider'
import { downloadAllPayslipsForRun } from '@/lib/hr-payslip-pdf'

type RunJson = {
  id: string
  period: string
  title: string
  status: string
  defaultTaxRatePct: number
  totals?: { gross: number; net: number; count: number; tax: number }
}

type LineJson = {
  id: string
  employeeId: string
  employeeName?: string
  employeeNumber?: string
  lineType: string
  gross: number
  allowances: number
  deductions: number
  overtimeAmount: number
  taxAmount: number
  net: number
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  hr_approved: 'HR approved',
  finance_approved: 'Finance approved',
  disbursed: 'Disbursed',
  rejected: 'Rejected',
}

function statusVariant(s: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (s === 'disbursed') return 'default'
  if (s === 'rejected') return 'destructive'
  if (s === 'draft') return 'outline'
  return 'secondary'
}

export default function HrPayrollPage() {
  const { actingUserHeaders } = useSessionUser()
  const [runs, setRuns] = useState<RunJson[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [period, setPeriod] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [taxPct, setTaxPct] = useState('15')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailRun, setDetailRun] = useState<RunJson | null>(null)
  const [lines, setLines] = useState<LineJson[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(resolvedApiUrl('/api/hr/payroll/runs'), {
        headers: { ...actingUserHeaders },
        credentials: 'same-origin',
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) setRuns((data.runs ?? []) as RunJson[])
    } finally {
      setLoading(false)
    }
  }, [actingUserHeaders])

  const loadDetail = useCallback(
    async (id: string) => {
      setDetailLoading(true)
      try {
        const res = await fetch(resolvedApiUrl(`/api/hr/payroll/runs/${id}`), {
          headers: { ...actingUserHeaders },
          credentials: 'same-origin',
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok) {
          setDetailRun(data.run as RunJson)
          setLines((data.lines ?? []) as LineJson[])
        }
      } finally {
        setDetailLoading(false)
      }
    },
    [actingUserHeaders]
  )

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (detailId) void loadDetail(detailId)
  }, [detailId, loadDetail])

  const createRun = async () => {
    setBusy(true)
    try {
      const res = await fetch(resolvedApiUrl('/api/hr/payroll/runs'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...actingUserHeaders },
        credentials: 'same-origin',
        body: JSON.stringify({
          period,
          defaultTaxRatePct: Number(taxPct),
          generateLines: true,
        }),
      })
      if (res.ok) {
        setCreateOpen(false)
        await load()
        const data = await res.json()
        setDetailId(data.run.id)
      }
    } finally {
      setBusy(false)
    }
  }

  const postAction = async (path: string) => {
    if (!detailId) return
    setBusy(true)
    try {
      const res = await fetch(resolvedApiUrl(`/api/hr/payroll/runs/${detailId}${path}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...actingUserHeaders },
        credentials: 'same-origin',
        body: JSON.stringify({}),
      })
      if (res.ok) {
        await load()
        await loadDetail(detailId)
      }
    } finally {
      setBusy(false)
    }
  }

  const updateLine = async (lineId: string, patch: Partial<LineJson>) => {
    setBusy(true)
    try {
      const res = await fetch(resolvedApiUrl(`/api/hr/payroll/lines/${lineId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...actingUserHeaders },
        credentials: 'same-origin',
        body: JSON.stringify(patch),
      })
      if (res.ok && detailId) await loadDetail(detailId)
    } finally {
      setBusy(false)
    }
  }

  const downloadBankCsv = () => {
    if (!detailId) return
    window.open(
      resolvedApiUrl(`/api/hr/payroll/runs/${detailId}/bank-export`),
      '_blank'
    )
  }

  const downloadPayslips = () => {
    if (!detailRun) return
    downloadAllPayslipsForRun(
      {
        ...detailRun,
        notes: '',
        submittedAt: null,
        hrApprovedAt: null,
        hrApprovedBy: null,
        financeApprovedAt: null,
        financeApprovedBy: null,
        disbursedAt: null,
        disbursedBy: null,
        rejectedAt: null,
        rejectedBy: null,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        defaultTaxRatePct: detailRun.defaultTaxRatePct,
        status: detailRun.status as 'draft',
      },
      lines.map((l) => ({
        ...l,
        runId: detailId!,
        notes: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        lineType: l.lineType as 'salary',
      }))
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Stipend / Payroll engine</h1>
          <p className="text-muted-foreground">
            Monthly salary processing, volunteer stipends, tax, allowances, and payslip generation.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New payroll run
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Payroll runs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No payroll runs yet. Create one and ensure staff have salary or stipend amounts set.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Net (SLE)</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.period}</TableCell>
                    <TableCell>{r.title}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(r.status)}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.totals?.count ?? 0}</TableCell>
                    <TableCell>{(r.totals?.net ?? 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => setDetailId(r.id)}>
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create payroll run</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Period (YYYY-MM)</Label>
              <Input value={period} onChange={(e) => setPeriod(e.target.value)} />
            </div>
            <div>
              <Label>Default tax rate (%)</Label>
              <Input value={taxPct} onChange={(e) => setTaxPct(e.target.value)} type="number" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void createRun()} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create & generate lines'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detailRun?.title ?? 'Payroll run'}{' '}
              {detailRun ? (
                <Badge className="ml-2" variant={statusVariant(detailRun.status)}>
                  {STATUS_LABEL[detailRun.status]}
                </Badge>
              ) : null}
            </DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : detailRun ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {detailRun.status === 'draft' && (
                  <>
                    <Button size="sm" disabled={busy} onClick={() => void postAction('/submit')}>
                      Submit for approval
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void fetch(resolvedApiUrl(`/api/hr/payroll/runs/${detailId}`), {
                          method: 'PATCH',
                          headers: {
                            'Content-Type': 'application/json',
                            ...actingUserHeaders,
                          },
                          credentials: 'same-origin',
                          body: JSON.stringify({ generateLines: true }),
                        }).then(() => {
                          if (detailId) void loadDetail(detailId)
                        })
                      }
                    >
                      Regenerate lines
                    </Button>
                  </>
                )}
                {detailRun.status === 'submitted' && (
                  <>
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => void postAction('/decision')}
                    >
                      HR approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onClick={() =>
                        void fetch(resolvedApiUrl(`/api/hr/payroll/runs/${detailId}/decision`), {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            ...actingUserHeaders,
                          },
                          credentials: 'same-origin',
                          body: JSON.stringify({ action: 'reject' }),
                        }).then(() => {
                          if (detailId) void loadDetail(detailId)
                        })
                      }
                    >
                      Reject
                    </Button>
                  </>
                )}
                {detailRun.status === 'hr_approved' && (
                  <Button size="sm" disabled={busy} onClick={() => void postAction('/decision')}>
                    Finance approve
                  </Button>
                )}
                {detailRun.status === 'finance_approved' && (
                  <Button size="sm" disabled={busy} onClick={() => void postAction('/disburse')}>
                    Mark disbursed
                  </Button>
                )}
                {(detailRun.status === 'finance_approved' ||
                  detailRun.status === 'disbursed') && (
                  <>
                    <Button size="sm" variant="outline" onClick={downloadBankCsv}>
                      <Download className="mr-1 h-4 w-4" />
                      Bank CSV
                    </Button>
                    <Button size="sm" variant="outline" onClick={downloadPayslips}>
                      Payslip PDFs
                    </Button>
                  </>
                )}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead>Allow.</TableHead>
                    <TableHead>Deduct.</TableHead>
                    <TableHead>OT</TableHead>
                    <TableHead>Tax</TableHead>
                    <TableHead>Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <div className="font-medium">{l.employeeName}</div>
                        <div className="text-xs text-muted-foreground">{l.employeeNumber}</div>
                      </TableCell>
                      <TableCell>{l.lineType}</TableCell>
                      <TableCell>{l.gross.toFixed(2)}</TableCell>
                      <TableCell>
                        {detailRun.status === 'draft' ? (
                          <Input
                            className="h-8 w-20"
                            type="number"
                            defaultValue={l.allowances}
                            onBlur={(e) =>
                              void updateLine(l.id, { allowances: Number(e.target.value) })
                            }
                          />
                        ) : (
                          l.allowances.toFixed(2)
                        )}
                      </TableCell>
                      <TableCell>
                        {detailRun.status === 'draft' ? (
                          <Input
                            className="h-8 w-20"
                            type="number"
                            defaultValue={l.deductions}
                            onBlur={(e) =>
                              void updateLine(l.id, { deductions: Number(e.target.value) })
                            }
                          />
                        ) : (
                          l.deductions.toFixed(2)
                        )}
                      </TableCell>
                      <TableCell>
                        {detailRun.status === 'draft' ? (
                          <Input
                            className="h-8 w-20"
                            type="number"
                            defaultValue={l.overtimeAmount}
                            onBlur={(e) =>
                              void updateLine(l.id, { overtimeAmount: Number(e.target.value) })
                            }
                          />
                        ) : (
                          l.overtimeAmount.toFixed(2)
                        )}
                      </TableCell>
                      <TableCell>{l.taxAmount.toFixed(2)}</TableCell>
                      <TableCell className="font-medium">{l.net.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
