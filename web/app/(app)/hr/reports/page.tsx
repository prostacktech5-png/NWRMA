'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { resolvedApiUrl } from '@/lib/apiBase'
import { useSessionUser } from '@/components/demo-session-provider'

export default function HrReportsPage() {
  const { actingUserHeaders } = useSessionUser()
  const [busy, setBusy] = useState<string | null>(null)

  const exportPayrollHistory = async () => {
    setBusy('payroll')
    try {
      const res = await fetch(resolvedApiUrl('/api/hr/payroll/runs'), {
        headers: { ...actingUserHeaders },
        credentials: 'same-origin',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return
      const runs = (data.runs ?? []) as Array<{
        period: string
        title: string
        status: string
        totals?: { net: number; count: number }
      }>
      const disbursed = runs.filter((r) => r.status === 'disbursed')
      const header = 'period,title,status,staff_count,net_total_sle'
      const rows = disbursed.map(
        (r) =>
          `${r.period},"${r.title.replace(/"/g, '""')}",${r.status},${r.totals?.count ?? 0},${r.totals?.net ?? 0}`
      )
      const csv = [header, ...rows].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'hr-payroll-history.csv'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setBusy(null)
    }
  }

  const exportSubscriptions = async () => {
    setBusy('subs')
    try {
      const res = await fetch(resolvedApiUrl('/api/hr/subscriptions'), {
        headers: { ...actingUserHeaders },
        credentials: 'same-origin',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return
      const subs = (data.subscriptions ?? []) as Array<{
        name: string
        subscriptionType: string
        vendor: string
        expiresAt: string
        status: string
        daysUntilExpiry: number
        cost: number | null
        currency: string
      }>
      const header =
        'name,type,vendor,expires_at,status,days_until_expiry,cost,currency'
      const rows = subs.map(
        (s) =>
          `"${s.name.replace(/"/g, '""')}",${s.subscriptionType},${s.vendor},${s.expiresAt},${s.status},${s.daysUntilExpiry},${s.cost ?? ''},${s.currency}`
      )
      const csv = [header, ...rows].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'hr-subscription-expiry.csv'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">HR reports &amp; outputs</h1>
        <p className="text-muted-foreground">
          Export payroll history and subscription renewal schedules.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="h-5 w-5" />
              Payroll history
            </CardTitle>
            <CardDescription>Disbursed payroll runs with net totals (CSV)</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              disabled={busy === 'payroll'}
              onClick={() => void exportPayrollHistory()}
            >
              {busy === 'payroll' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download CSV
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="h-5 w-5" />
              Subscription expiry report
            </CardTitle>
            <CardDescription>All subscriptions with days until expiry (CSV)</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              disabled={busy === 'subs'}
              onClick={() => void exportSubscriptions()}
            >
              {busy === 'subs' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download CSV
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
