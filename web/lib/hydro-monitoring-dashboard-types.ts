/**
 * Shape aligned with workspace api-client-react monitoring types (UI contract).
 */
export type MonitoringFloodRisk = 'low' | 'medium' | 'high' | 'critical'

export type MonitoringTrend = 'rising' | 'falling' | 'stable'

export interface MonitoringDataStationsItem {
  id: string
  code?: string
  station: string
  region: string
  status?: 'active' | 'inactive'
  /** Map position: parseable GPS from latest valid reading when present, else station registry */
  lat: number | null
  lng: number | null
  latestLevel: number
  threshold: number
  floodRisk: MonitoringFloodRisk
  trend: MonitoringTrend
  levelHistory?: number[]
  /** HoD-valid readings used for operational median (max 5); omitted when unknown */
  operationalSampleCount?: number
}

export interface MonitoringDashboardPayload {
  stations: MonitoringDataStationsItem[]
  alertCount: number
  lastUpdated: string
}

/** Keep in sync: monitoring page `fetch` interval and dashboard footer note. */
export const MONITORING_POLL_INTERVAL_MS = 8_000
