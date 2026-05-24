'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { DashboardMetrics } from '@/lib/super-admin/dashboard-metrics'
import { formatDate } from '@/lib/mock-data'

export function SaAlertsList({ metrics }: { metrics: DashboardMetrics }) {
  const alerts = metrics.recentAlerts

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Platform alerts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open alerts.</p>
        ) : (
          alerts.map((a) => (
            <div
              key={a.id}
              className="flex items-start justify-between gap-2 rounded-lg border border-border p-3"
            >
              <div>
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(new Date(a.createdAt))}
                </p>
              </div>
              <Badge variant={a.severity === 'critical' ? 'destructive' : 'secondary'}>
                {a.severity}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

