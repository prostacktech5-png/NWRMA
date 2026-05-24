import { withSuperAdminAuth } from '@/lib/super-admin/api-auth'
import { loadDashboardMetrics } from '@/lib/super-admin/dashboard-metrics'
import { dashboardMetricsToCsv } from '@/lib/super-admin/export-dashboard'

export async function GET(req: Request) {
  return withSuperAdminAuth(req, 'system', 'read', async () => {
    const url = new URL(req.url)
    const format = url.searchParams.get('format')
    const metrics = await loadDashboardMetrics()
    if (format === 'csv') {
      return new Response(dashboardMetricsToCsv(metrics), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="dashboard-metrics.csv"',
        },
      })
    }
    return Response.json(metrics)
  })
}
