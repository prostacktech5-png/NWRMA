import { getSql, isPostgresUndefinedRelationError } from '@/lib/db'
import { loadOrSeedErpReferencePayload } from '@/lib/db/reference-data-persistence'

export type DashboardMetrics = {
  totalBoreholes: number
  totalLicenseApplications: number
  approvedLicenses: number
  pendingApplications: number
  rejectedApplications: number
  expiredLicenses: number
  activeFieldOfficers: number
  totalUsers: number
  dailySubmissions: { date: string; count: number }[]
  regionalStats: { name: string; count: number }[]
  districtStats: { name: string; count: number }[]
  chiefdomStats: { name: string; count: number }[]
  licenseByStatus: { status: string; count: number }[]
  failedSyncCount: number
  offlinePendingSync: number
  recentAlerts: { id: string; title: string; severity: string; createdAt: string }[]
  recentBoreholes: { id: string; boreholeId: string; district: string; createdAt: string }[]
  revenueTotal: number
  complianceRate: number
}

export async function loadDashboardMetrics(): Promise<DashboardMetrics> {
  const sql = getSql()
  const payload = await loadOrSeedErpReferencePayload()

  let totalBoreholes = 0
  let regionalStats: { name: string; count: number }[] = []
  let districtStats: { name: string; count: number }[] = []
  let chiefdomStats: { name: string; count: number }[] = []
  let recentBoreholes: DashboardMetrics['recentBoreholes'] = []

  try {
    const countRows = await sql`SELECT COUNT(*)::int AS c FROM boreholes WHERE deleted_at IS NULL`
    totalBoreholes = Number((countRows[0] as { c: number })?.c ?? 0)

    const regionalRows = await sql`
      SELECT r.name, COUNT(b.id)::int AS c
      FROM boreholes b
      JOIN regions r ON r.id = b.region_id
      WHERE b.deleted_at IS NULL
      GROUP BY r.name ORDER BY c DESC LIMIT 10
    `
    regionalStats = regionalRows.map((r) => ({
      name: String((r as { name: string }).name),
      count: Number((r as { c: number }).c),
    }))

    const districtRows = await sql`
      SELECT d.name, COUNT(b.id)::int AS c
      FROM boreholes b
      JOIN districts d ON d.id = b.district_id
      WHERE b.deleted_at IS NULL
      GROUP BY d.name ORDER BY c DESC LIMIT 10
    `
    districtStats = districtRows.map((r) => ({
      name: String((r as { name: string }).name),
      count: Number((r as { c: number }).c),
    }))

    const chiefdomRows = await sql`
      SELECT c.name, COUNT(b.id)::int AS c
      FROM boreholes b
      JOIN chiefdoms c ON c.id = b.chiefdom_id
      WHERE b.deleted_at IS NULL
      GROUP BY c.name ORDER BY c DESC LIMIT 10
    `
    chiefdomStats = chiefdomRows.map((r) => ({
      name: String((r as { name: string }).name),
      count: Number((r as { c: number }).c),
    }))

    const recentRows = await sql`
      SELECT b.id, b.borehole_id, d.name AS district, b.created_at
      FROM boreholes b
      JOIN districts d ON d.id = b.district_id
      WHERE b.deleted_at IS NULL
      ORDER BY b.created_at DESC LIMIT 8
    `
    recentBoreholes = recentRows.map((r) => {
      const row = r as Record<string, unknown>
      return {
        id: String(row.id),
        boreholeId: String(row.borehole_id),
        district: String(row.district),
        createdAt: new Date(String(row.created_at)).toISOString(),
      }
    })
  } catch (e) {
    if (!isPostgresUndefinedRelationError(e)) throw e
    totalBoreholes = 0
  }

  const apps = payload.licenseApplications ?? []
  const statusCounts = new Map<string, number>()
  for (const a of apps) {
    statusCounts.set(a.status, (statusCounts.get(a.status) ?? 0) + 1)
  }

  let dbLicenseCount = 0
  try {
    const lr = await sql`SELECT COUNT(*)::int AS c FROM license_applications WHERE deleted_at IS NULL`
    dbLicenseCount = Number((lr[0] as { c: number })?.c ?? 0)
  } catch {
    dbLicenseCount = apps.length
  }

  const totalLicenseApplications = Math.max(apps.length, dbLicenseCount)
  const approvedLicenses = statusCounts.get('approved') ?? 0
  const pendingApplications =
    (statusCounts.get('submitted') ?? 0) +
    (statusCounts.get('under_review') ?? 0) +
    (statusCounts.get('field_inspection') ?? 0) +
    (statusCounts.get('pending_payment') ?? 0)
  const rejectedApplications = statusCounts.get('rejected') ?? 0
  const expiredLicenses = statusCounts.get('expired') ?? 0

  let totalUsers = 0
  let activeFieldOfficers = 0
  try {
    const ur = await sql`
      SELECT COUNT(*)::int AS c FROM "User" WHERE deleted_at IS NULL AND status = 'active'
    `
    totalUsers = Number((ur[0] as { c: number })?.c ?? 0)
    const fr = await sql`
      SELECT COUNT(DISTINCT upr.user_id)::int AS c
      FROM user_platform_roles upr
      JOIN platform_roles pr ON pr.id = upr.role_id
      WHERE pr.code = 'field_officer'
    `
    activeFieldOfficers = Number((fr[0] as { c: number })?.c ?? 0)
  } catch {
    totalUsers = 0
  }

  let failedSyncCount = 0
  let offlinePendingSync = 0
  try {
    const fs = await sql`
      SELECT COUNT(*)::int AS c FROM field_sync_logs WHERE status = 'failed'
        AND synced_at > now() - interval '7 days'
    `
    failedSyncCount = Number((fs[0] as { c: number })?.c ?? 0)
    const op = await sql`
      SELECT COUNT(*)::int AS c FROM field_tasks WHERE status IN ('pending', 'in_progress')
    `
    offlinePendingSync = Number((op[0] as { c: number })?.c ?? 0)
  } catch {
    /* optional tables */
  }

  let recentAlerts: DashboardMetrics['recentAlerts'] = []
  try {
    const ar = await sql`
      SELECT id, title, severity, created_at FROM platform_alerts
      WHERE acknowledged_at IS NULL ORDER BY created_at DESC LIMIT 6
    `
    recentAlerts = ar.map((r) => {
      const row = r as Record<string, unknown>
      return {
        id: String(row.id),
        title: String(row.title),
        severity: String(row.severity),
        createdAt: new Date(String(row.created_at)).toISOString(),
      }
    })
  } catch {
    recentAlerts = []
  }

  const dailyMap = new Map<string, number>()
  for (const a of apps) {
    const d = new Date(a.submittedAt).toISOString().slice(0, 10)
    dailyMap.set(d, (dailyMap.get(d) ?? 0) + 1)
  }
  const dailySubmissions = [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, count]) => ({ date, count }))

  const licenseByStatus = [...statusCounts.entries()].map(([status, count]) => ({
    status,
    count,
  }))

  let revenueTotal = 0
  try {
    const rev = await sql`
      SELECT COALESCE(SUM(amount), 0)::float AS t FROM finance_funds_receipts
    `
    revenueTotal = Number((rev[0] as { t: number })?.t ?? 0)
  } catch {
    revenueTotal = 0
  }

  const complianceRate =
    totalBoreholes > 0
      ? Math.round((approvedLicenses / Math.max(totalLicenseApplications, 1)) * 100)
      : 0

  return {
    totalBoreholes,
    totalLicenseApplications,
    approvedLicenses,
    pendingApplications,
    rejectedApplications,
    expiredLicenses,
    activeFieldOfficers,
    totalUsers,
    dailySubmissions,
    regionalStats,
    districtStats,
    chiefdomStats,
    licenseByStatus,
    failedSyncCount,
    offlinePendingSync,
    recentAlerts,
    recentBoreholes,
    revenueTotal,
    complianceRate,
  }
}
