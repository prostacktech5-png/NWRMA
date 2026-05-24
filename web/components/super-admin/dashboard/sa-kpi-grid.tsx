'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DashboardMetrics } from '@/lib/super-admin/dashboard-metrics'
import { formatCurrency } from '@/lib/mock-data'

export function SaKpiGrid({ metrics }: { metrics: DashboardMetrics }) {
  const items = [
    { label: 'Total boreholes', value: metrics.totalBoreholes.toLocaleString() },
    { label: 'License applications', value: metrics.totalLicenseApplications.toLocaleString() },
    { label: 'Approved licenses', value: metrics.approvedLicenses.toLocaleString() },
    { label: 'Pending review', value: metrics.pendingApplications.toLocaleString() },
    { label: 'Platform users', value: metrics.totalUsers.toLocaleString() },
    { label: 'Field officers', value: metrics.activeFieldOfficers.toLocaleString() },
    { label: 'Revenue (receipts)', value: formatCurrency(metrics.revenueTotal) },
    { label: 'Compliance rate', value: `${metrics.complianceRate}%` },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {item.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
