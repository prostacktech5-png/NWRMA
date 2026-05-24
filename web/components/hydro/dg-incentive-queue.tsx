'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSessionUser } from '@/components/demo-session-provider'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/hydro/status-badge'
import type { OfficerPaymentStatus } from '@/lib/types'
import { formatNLe } from '@/lib/mock-data'

type PaymentRow = {
  id: string
  officerName: string
  yearMonth: string
  validSubmissions: number
  rateSle: number
  totalSle: number
  status: OfficerPaymentStatus
}

export function DgHydrologicalIncentiveQueue() {
  const { actingUserHeaders } = useSessionUser()
  const [rows, setRows] = useState<PaymentRow[]>([])
  const [pendingValue, setPendingValue] = useState(0)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/hydrological/payments?status=submitted')
    if (!res.ok) return
    const data = await res.json()
    setRows(data.payments)
    setPendingValue(
      (data.payments as PaymentRow[]).reduce((s: number, p: PaymentRow) => s + p.totalSle, 0)
    )
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function approve(id: string) {
    setBusyId(id)
    setMsg(null)
    const res = await fetch(`/api/hydrological/payments/${id}/approve`, {
      method: 'POST',
      headers: { ...actingUserHeaders },
    })
    const data = await res.json().catch(() => ({}))
    setBusyId(null)
    if (!res.ok) {
      setMsg(data.error ?? 'Could not approve.')
      return
    }
    setMsg('Approved. Disburse from Hydrological → Officer Payments when paid out.')
    await load()
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Submitted incentive lines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{rows.length}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              HoD has forwarded these months for your approval.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total (submitted)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{formatNLe(pendingValue)}</div>
          </CardContent>
        </Card>
      </div>

      {msg ? (
        <p className="text-sm text-secondary" role="status">
          {msg}
        </p>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Incentive approval queue</CardTitle>
            <CardDescription>
              Approve in one click. Finance may later assume disbursement duties; for now DG records
              payout on the Hydrological payments screen.
            </CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={() => void load()} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-secondary" />
              <p className="mt-4 text-muted-foreground">
                No gauge officer payments awaiting DG approval.
              </p>
              <Button variant="link" asChild className="mt-2">
                <Link href="/finance/payments">Open Finance officer payments</Link>
              </Button>
            </div>

          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Officer</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Readings</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.officerName}</TableCell>
                    <TableCell className="font-mono text-sm">{p.yearMonth}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.validSubmissions}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatNLe(p.rateSle)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatNLe(p.totalSle)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busyId === p.id}
                        onClick={() => void approve(p.id)}
                      >
                        Approve
                      </Button>
                    </TableCell>
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
