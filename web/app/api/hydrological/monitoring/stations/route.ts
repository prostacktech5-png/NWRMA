import { tryRespondWithDbSetupHint } from '@/lib/db'
import { loadOrSeedErpReferencePayload } from '@/lib/db/reference-data-persistence'
import { fieldReportToWaterLevelReading } from '@/lib/field-report-mapper'
import { getHydroPaymentStore } from '@/lib/hydro-payment-store'
import {
  buildMonitoringRollupSnapshots,
  stagePercentOfThreshold,
  statusBandFromPct,
} from '@/lib/hydro-monitoring-aggregator'
import { mapApiStationsToDashboard } from '@/lib/hydro-monitoring-dashboard-mapper'
import { fetchNwrmaUpstreamFieldReports } from '@/lib/nwrma-upstream-field-reports'

/**
 * Enriched monitoring stations: registry + validated stage + threshold % / status + sparkline.
 */
export async function GET(req: Request) {
  return tryRespondWithDbSetupHint(async () => {
    const ref = await loadOrSeedErpReferencePayload()
    const monitoringStations = ref.monitoringStations
    const floodIncidents = ref.floodIncidents

    const { searchParams } = new URL(req.url)
    const windowDays = Math.min(
      365,
      Math.max(1, Number(searchParams.get('windowDays') ?? '30') || 30)
    )

    const store = await getHydroPaymentStore()
    const mergedReadings = [...store.readings]
    const seenReadingIds = new Set(mergedReadings.map((r) => r.id))
    const upstreamReports = await fetchNwrmaUpstreamFieldReports(req)
    for (const fr of upstreamReports) {
      const row = fieldReportToWaterLevelReading(fr)
      if (seenReadingIds.has(row.id)) continue
      seenReadingIds.add(row.id)
      mergedReadings.push(row)
    }

    const { stationRollup: stationUniverse, snapshots } = buildMonitoringRollupSnapshots(
      monitoringStations,
      mergedReadings,
      { windowDays, now: new Date() }
    )

    const activeFloodAlerts = floodIncidents.filter(
      (f) => f.status === 'open' || f.status === 'monitoring'
    ).length

    const stations = stationUniverse.map((s) => {
      const mon = snapshots.get(s.id) ?? null
      let pctOfThreshold: number | null = null
      let statusBand: 'low' | 'medium' | 'high' | null = null
      const stageForRisk =
        mon?.operationalStageM ?? mon?.latestStageM
      if (stageForRisk != null && s.alertThresholdM > 0) {
        pctOfThreshold = stagePercentOfThreshold(stageForRisk, s.alertThresholdM)
        statusBand = statusBandFromPct(pctOfThreshold)
      }
      return {
        ...s,
        monitoring: mon,
        pctOfThreshold,
        statusBand,
      }
    })

    const stationsWithValidatedData = stations.filter(
      (s) => s.monitoring && s.monitoring.latestStageM != null
    ).length

    /** Monitoring UI only lists gauges with at least one HoD-valid reading (no empty 0 m placeholders). */
    const stationsOnDashboard = stations.filter((s) => s.monitoring?.latestStageM != null)

    const body = {
      windowDays,
      stationsWithValidatedData,
      activeFloodAlerts,
      stations,
      dashboard: mapApiStationsToDashboard(stationsOnDashboard),
    }

    return Response.json(body, {
      headers: { 'Cache-Control': 'no-store, must-revalidate' },
    })
  })
}
