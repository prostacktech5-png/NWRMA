import type {
  MonitoringDashboardPayload,
  MonitoringDataStationsItem,
  MonitoringFloodRisk,
  MonitoringTrend,
} from '@/lib/hydro-monitoring-dashboard-types'
import { resolveStationMapCoords } from '@/lib/sierra-leone-map-bounds'

type ApiStation = {
  id: string
  name: string
  code: string
  district: string
  alertThresholdM: number
  status: 'active' | 'inactive'
  lat: number | null
  lng: number | null
  pctOfThreshold: number | null
  statusBand: 'low' | 'medium' | 'high' | null
  monitoring: {
    latestStageM: number | null
    operationalStageM: number | null
    operationalSampleCount: number
    rateOfChangeMPerDay: number | null
    sparklineLevels: number[]
    readingLat: number | null
    readingLng: number | null
  } | null
}

function toFloodRisk(
  band: 'low' | 'medium' | 'high' | null,
  pct: number
): MonitoringFloodRisk {
  if (band === 'high' && pct >= 95) return 'critical'
  if (band === 'high') return 'high'
  if (band === 'medium') return 'medium'
  return 'low'
}

function toTrend(rate: number | null | undefined): MonitoringTrend {
  if (rate == null || !Number.isFinite(rate)) return 'stable'
  const eps = 0.0005
  if (rate > eps) return 'rising'
  if (rate < -eps) return 'falling'
  return 'stable'
}

export function mapApiStationsToDashboard(stations: ApiStation[]): MonitoringDashboardPayload {
  const mapped: MonitoringDataStationsItem[] = stations.map((s) => {
    const mon = s.monitoring
    const displayM = mon?.operationalStageM ?? mon?.latestStageM ?? 0
    const latestLevel = displayM
    const threshold = s.alertThresholdM
    const pct =
      threshold > 0 && latestLevel > 0
        ? (latestLevel / threshold) * 100
        : s.pctOfThreshold ?? 0

    const band =
      latestLevel > 0 && (mon?.operationalStageM != null || mon?.latestStageM != null)
        ? s.statusBand
        : 'low'

    const mapCoords = resolveStationMapCoords(
      s.lat,
      s.lng,
      mon?.readingLat ?? null,
      mon?.readingLng ?? null,
    )

    return {
      id: s.id,
      code: s.code,
      station: s.name,
      region: s.district,
      status: s.status,
      lat: mapCoords?.lat ?? null,
      lng: mapCoords?.lng ?? null,
      latestLevel,
      threshold,
      floodRisk: toFloodRisk(band, pct),
      trend: toTrend(mon?.rateOfChangeMPerDay),
      levelHistory:
        mon?.sparklineLevels && mon.sparklineLevels.length > 0
          ? mon.sparklineLevels
          : undefined,
      operationalSampleCount:
        mon?.operationalSampleCount != null && mon.operationalSampleCount > 0
          ? mon.operationalSampleCount
          : undefined,
    }
  })

  const alertCount = mapped.filter(
    (s) => s.floodRisk === 'high' || s.floodRisk === 'critical'
  ).length

  return {
    stations: mapped,
    alertCount,
    lastUpdated: new Date().toISOString(),
  }
}
