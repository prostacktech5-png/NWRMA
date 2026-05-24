import type { DashboardMetrics } from '@/lib/super-admin/dashboard-metrics'

function csvEscape(value: string | number): string {
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function section(title: string, rows: [string, string | number][]): string {
  const lines = [title, 'metric,value', ...rows.map(([k, v]) => `${csvEscape(k)},${csvEscape(v)}`), '']
  return lines.join('\n')
}

export function dashboardMetricsToCsv(metrics: DashboardMetrics): string {
  const parts = [
    section('Summary', [
      ['Total boreholes', metrics.totalBoreholes],
      ['License applications', metrics.totalLicenseApplications],
      ['Approved licenses', metrics.approvedLicenses],
      ['Pending applications', metrics.pendingApplications],
      ['Rejected applications', metrics.rejectedApplications],
      ['Expired licenses', metrics.expiredLicenses],
      ['Active field officers', metrics.activeFieldOfficers],
      ['Total users', metrics.totalUsers],
      ['Revenue total', metrics.revenueTotal],
      ['Compliance rate %', metrics.complianceRate],
      ['Failed sync (7d)', metrics.failedSyncCount],
      ['Offline pending sync', metrics.offlinePendingSync],
    ]),
    'Regional stats',
    'region,count',
    ...metrics.regionalStats.map((r) => `${csvEscape(r.name)},${r.count}`),
    '',
    'District stats',
    'district,count',
    ...metrics.districtStats.map((r) => `${csvEscape(r.name)},${r.count}`),
    '',
    'License by status',
    'status,count',
    ...metrics.licenseByStatus.map((r) => `${csvEscape(r.status)},${r.count}`),
    '',
    'Daily submissions',
    'date,count',
    ...metrics.dailySubmissions.map((r) => `${r.date},${r.count}`),
  ]
  return parts.join('\n')
}
