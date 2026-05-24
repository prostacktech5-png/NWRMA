import type {
  MonitoringDataStationsItem,
  MonitoringFloodRisk,
  MonitoringTrend,
} from '@/lib/hydro-monitoring-dashboard-types'

export type RiskBandUi = 'normal' | 'warning' | 'danger'

export function riskToBand(risk: MonitoringFloodRisk): RiskBandUi {
  if (risk === 'high' || risk === 'critical') return 'danger'
  if (risk === 'medium') return 'warning'
  return 'normal'
}

export function bandLabel(band: RiskBandUi): string {
  if (band === 'danger') return 'Danger'
  if (band === 'warning') return 'Warning'
  return 'Normal'
}

export function riskSortScore(risk: MonitoringFloodRisk): number {
  if (risk === 'critical') return 4
  if (risk === 'high') return 3
  if (risk === 'medium') return 2
  return 1
}

export function pctOfThreshold(station: MonitoringDataStationsItem): number {
  if (station.threshold <= 0) return 0
  return Math.round((station.latestLevel / station.threshold) * 1000) / 10
}

export function thresholdLines(thresholdM: number) {
  return {
    normal: thresholdM * 0.7,
    warning: thresholdM * 0.85,
    danger: thresholdM,
  }
}

export type BasinSummaryRow = {
  region: string
  total: number
  normal: number
  warning: number
  danger: number
  highestLevel: number
  highestStation: string
  trend: MonitoringTrend
}

export function buildBasinSummary(stations: MonitoringDataStationsItem[]): BasinSummaryRow[] {
  const byRegion = new Map<string, MonitoringDataStationsItem[]>()
  for (const s of stations) {
    const list = byRegion.get(s.region) ?? []
    list.push(s)
    byRegion.set(s.region, list)
  }

  return [...byRegion.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([region, list]) => {
      let normal = 0
      let warning = 0
      let danger = 0
      let highestLevel = -Infinity
      let highestStation = list[0]?.station ?? '—'
      let worstTrend: MonitoringTrend = 'stable'
      let worstTrendScore = 0

      for (const s of list) {
        const band = riskToBand(s.floodRisk)
        if (band === 'normal') normal += 1
        else if (band === 'warning') warning += 1
        else danger += 1
        if (s.latestLevel > highestLevel) {
          highestLevel = s.latestLevel
          highestStation = s.station
        }
        const tScore = s.trend === 'rising' ? 2 : s.trend === 'stable' ? 1 : 0
        if (tScore > worstTrendScore) {
          worstTrendScore = tScore
          worstTrend = s.trend
        }
      }

      return {
        region,
        total: list.length,
        normal,
        warning,
        danger,
        highestLevel: Number.isFinite(highestLevel) ? highestLevel : 0,
        highestStation,
        trend: worstTrend,
      }
    })
}

export type FloodAlertItem = {
  id: string
  severity: 'danger' | 'warning' | 'info'
  title: string
  description: string
  at: string
}

export function buildAlertsFromStations(
  stations: MonitoringDataStationsItem[],
  lastUpdated: string,
): FloodAlertItem[] {
  const alerts: FloodAlertItem[] = []

  for (const s of stations) {
    const pct = pctOfThreshold(s)
    if (s.floodRisk === 'critical' || s.floodRisk === 'high') {
      alerts.push({
        id: `${s.id}-danger`,
        severity: 'danger',
        title: 'Danger level exceeded',
        description: `${s.station} — ${s.region} at ${s.latestLevel.toFixed(2)} m (${pct}% of threshold)`,
        at: lastUpdated,
      })
    } else if (s.floodRisk === 'medium') {
      alerts.push({
        id: `${s.id}-warning`,
        severity: 'warning',
        title: 'Warning threshold reached',
        description: `${s.station} — ${s.region} at ${s.latestLevel.toFixed(2)} m (${pct}% of threshold)`,
        at: lastUpdated,
      })
    }
  }

  if (alerts.length === 0 && stations.length > 0) {
    alerts.push({
      id: 'all-normal',
      severity: 'info',
      title: 'All stations within normal range',
      description: 'No warning or danger levels detected across the monitoring network.',
      at: lastUpdated,
    })
  }

  return alerts.sort((a, b) => {
    const rank = { danger: 0, warning: 1, info: 2 }
    return rank[a.severity] - rank[b.severity]
  })
}

export function estimateDailyRate(
  history: number[] | undefined,
  trend: MonitoringTrend,
): number {
  if (history && history.length >= 2) {
    const first = history[0]!
    const last = history[history.length - 1]!
    return (last - first) / Math.max(1, history.length - 1)
  }
  if (trend === 'rising') return 0.12
  if (trend === 'falling') return -0.12
  return 0
}
