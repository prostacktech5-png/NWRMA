'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SaAlertsList } from '@/components/super-admin/dashboard/sa-alerts-list'
import { SaKpiGrid } from '@/components/super-admin/dashboard/sa-kpi-grid'
import { SaLicenseChart } from '@/components/super-admin/dashboard/sa-license-chart'
import { SaRegionalChart } from '@/components/super-admin/dashboard/sa-regional-chart'
import { resolvedApiUrl } from '@/lib/apiBase'
import type { DashboardMetrics } from '@/lib/super-admin/dashboard-metrics'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/lib/mock-data'

export default function SuperAdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(resolvedApiUrl('/api/super-admin/dashboard/metrics'), {
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Failed to load metrics')
      setMetrics(data as DashboardMetrics)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading && !metrics) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !metrics) {
    return <p className="text-destructive">{error ?? 'No metrics'}</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href={resolvedApiUrl('/api/super-admin/dashboard/metrics?format=csv')}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </a>
        </Button>
      </div>

      <SaKpiGrid metrics={metrics} />

      <div className="grid gap-6 lg:grid-cols-2">
        <SaLicenseChart metrics={metrics} />
        <SaRegionalChart metrics={metrics} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SaAlertsList metrics={metrics} />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent boreholes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>District</TableHead>
                  <TableHead>Registered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.recentBoreholes.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.boreholeId}</TableCell>
                    <TableCell>{b.district}</TableCell>
                    <TableCell>{formatDate(new Date(b.createdAt))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
