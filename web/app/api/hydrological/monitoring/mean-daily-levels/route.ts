import { tryRespondWithDbSetupHint } from '@/lib/db'
import { loadOrSeedErpReferencePayload } from '@/lib/db/reference-data-persistence'
import { fieldReportToWaterLevelReading } from '@/lib/field-report-mapper'
import { getHydroPaymentStore } from '@/lib/hydro-payment-store'
import {
  buildMeanDailyWaterSeriesFromReadings,
  collectAvailableMonthsFromMultiSeries,
  collectAvailableMonthsFromSeries,
  deriveGlobalMeanDailyInsights,
  deriveMeanDailyInsights,
  filterMeanDailySeriesByMonth,
  listStationsWithMeanDailyData,
  resolveStationIdForMeanDaily,
  type MeanDailyMultiSeriesEntry,
} from '@/lib/hydro-mean-daily-build'
import { rollupMonitoringStationsForSnapshots } from '@/lib/hydro-monitoring-aggregator'
import { fetchNwrmaUpstreamFieldReports } from '@/lib/nwrma-upstream-field-reports'

export const dynamic = 'force-dynamic'

function formatDdMmYyyy(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map((x) => Number(x))
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return dayKey
  const dd = String(d).padStart(2, '0')
  const mm = String(m).padStart(2, '0')
  return `${dd}/${mm}/${y}`
}

function parseMonthParam(raw: string | null): string | null {
  const m = (raw ?? '').trim()
  if (!m) return null
  if (!/^\d{4}-\d{2}$/.test(m)) return null
  return m
}

function yearSpanFromSeries(series: { date: string }[]): string {
  const y0 = series[0] ? new Date(series[0].date + 'T12:00:00.000Z').getUTCFullYear() : null
  const y1 =
    series[series.length - 1] != null
      ? new Date(series[series.length - 1]!.date + 'T12:00:00.000Z').getUTCFullYear()
      : null
  return y0 != null && y1 != null ? (y0 === y1 ? String(y0) : `${y0}–${y1}`) : ''
}

function dataRangeCaptionFromDates(dates: string[], emptyHint?: string): string {
  if (dates.length >= 2) {
    const sorted = [...dates].sort()
    return `Data range: ${formatDdMmYyyy(sorted[0]!)} to ${formatDdMmYyyy(sorted[sorted.length - 1]!)}`
  }
  if (dates.length === 1) {
    return `Data range: ${formatDdMmYyyy(dates[0]!)}`
  }
  return emptyHint ?? ''
}

function buildMultiSeriesPayload(
  merged: Parameters<typeof buildMeanDailyWaterSeriesFromReadings>[0],
  stations: ReturnType<typeof listStationsWithMeanDailyData>,
  from: Date,
  month: string | null,
  resolve: (r: Parameters<typeof resolveStationIdForMeanDaily>[0]) => string
): {
  multiSeries: MeanDailyMultiSeriesEntry[]
  availableMonths: string[]
  dataRangeCaption: string
  peakSummary: string | null
  lowSummary: string | null
  subtitle: string
} {
  const multiSeries: MeanDailyMultiSeriesEntry[] = []
  for (const s of stations) {
    if (s.dayCount <= 0) continue
    const full = buildMeanDailyWaterSeriesFromReadings(merged, {
      stationId: s.id,
      from,
      resolveStationId: resolve,
    })
    const series = filterMeanDailySeriesByMonth(full, month)
    if (!series.length) continue
    multiSeries.push({
      stationId: s.id,
      stationLabel: `${s.name} — ${s.district}`,
      series,
    })
  }

  const availableMonths = collectAvailableMonthsFromMultiSeries(multiSeries)
  const allDates = multiSeries.flatMap((e) => e.series.map((p) => p.date))
  const global = deriveGlobalMeanDailyInsights(multiSeries)

  const peakSummary =
    global.peak != null
      ? `Historical Peak: ${global.peak.meanLevelM.toFixed(2)}m on ${formatDdMmYyyy(global.peak.date)} (${global.peak.stationLabel})`
      : null

  const lowSummary =
    global.low != null
      ? `Historical Low: ${global.low.meanLevelM.toFixed(2)}m on ${formatDdMmYyyy(global.low.date)} (${global.low.stationLabel})`
      : null

  const yearSpan = yearSpanFromSeries(
    allDates.length
      ? [...allDates].sort().map((date) => ({ date }))
      : []
  )

  return {
    multiSeries,
    availableMonths,
    dataRangeCaption: dataRangeCaptionFromDates(
      allDates,
      month ? 'No daily means for any river in the selected month' : ''
    ),
    peakSummary,
    lowSummary,
    subtitle: `[Mean Daily Water Level · Comparing ${multiSeries.length} rivers${yearSpan ? ` · ${yearSpan}` : ''}]`,
  }
}

/**
 * Mean daily HoD-valid stage per monitoring station (UTC calendar day bucket).
 * Merged DB + field reports; scoped by resolved `stationId` and optional `month` (YYYY-MM).
 */
export async function GET(req: Request) {
  return tryRespondWithDbSetupHint(async () => {
    const { searchParams } = new URL(req.url)
    const rangeDays = Math.min(
      1098,
      Math.max(7, Number(searchParams.get('rangeDays') ?? '548') || 548)
    )
    const requestedStationId = (searchParams.get('stationId') ?? '').trim() || undefined
    const month = parseMonthParam(searchParams.get('month'))
    const selectAll = requestedStationId === 'all'

    const ref = await loadOrSeedErpReferencePayload()
    const catalogStations = ref.monitoringStations

    const store = await getHydroPaymentStore()
    const merged = [...store.readings]
    const seen = new Set(merged.map((r) => r.id))
    const upstream = await fetchNwrmaUpstreamFieldReports(req)
    for (const fr of upstream) {
      const row = fieldReportToWaterLevelReading(fr)
      if (seen.has(row.id)) continue
      seen.add(row.id)
      merged.push(row)
    }

    const rollupWithData = rollupMonitoringStationsForSnapshots(catalogStations, merged)

    const from = new Date()
    from.setUTCDate(from.getUTCDate() - rangeDays)

    const resolve = (r: Parameters<typeof resolveStationIdForMeanDaily>[0]) =>
      resolveStationIdForMeanDaily(r, catalogStations)

    const stations = listStationsWithMeanDailyData(merged, catalogStations, rollupWithData, {
      from,
    })

    const stationsPayload = stations.map(({ id, name, district, dayCount }) => ({
      id,
      name,
      district,
      dayCount,
    }))

    if (selectAll) {
      const multi = buildMultiSeriesPayload(merged, stations, from, month, resolve)
      const allDates = multi.multiSeries.flatMap((e) => e.series.map((p) => p.date)).sort()
      const periodStartLabel = allDates[0] ? formatDdMmYyyy(allDates[0]) : ''
      const periodEndLabel = allDates[allDates.length - 1]
        ? formatDdMmYyyy(allDates[allDates.length - 1]!)
        : ''

      return Response.json(
        {
          mode: 'multi' as const,
          rangeDays,
          stationId: 'all',
          stationLabel: null,
          month,
          stations: stationsPayload,
          availableMonths: multi.availableMonths,
          series: [],
          multiSeries: multi.multiSeries,
          subtitle: multi.subtitle,
          dataRangeCaption: multi.dataRangeCaption,
          periodLabels: {
            displayStart: periodStartLabel,
            displayEnd: periodEndLabel,
          },
          peakSummary: multi.peakSummary,
          lowSummary: multi.lowSummary,
          annotations: { peaks: [] },
        },
        { headers: { 'Cache-Control': 'no-store, must-revalidate' } }
      )
    }

    let stationId = requestedStationId
    if (!stationId && stations.length > 0) {
      stationId = [...stations].sort((a, b) => b.dayCount - a.dayCount || a.name.localeCompare(b.name))[0]!
        .id
    }

    const fullSeries =
      stationId != null
        ? buildMeanDailyWaterSeriesFromReadings(merged, {
            stationId,
            from,
            resolveStationId: resolve,
          })
        : []

    const availableMonths = collectAvailableMonthsFromSeries(fullSeries)
    const series = filterMeanDailySeriesByMonth(fullSeries, month)
    const insights = deriveMeanDailyInsights(series)

    const stationMeta = stations.find((s) => s.id === stationId)
    const rollupMeta = rollupWithData.find((s) => s.id === stationId)
    const stationLabel =
      stationMeta != null
        ? `${stationMeta.name} — ${stationMeta.district}`
        : rollupMeta != null
          ? `${rollupMeta.name} — ${rollupMeta.district}`
          : null

    const periodStartLabel = series[0] ? formatDdMmYyyy(series[0].date) : ''
    const periodEndLabel = series[series.length - 1] ? formatDdMmYyyy(series[series.length - 1].date) : ''
    const yearSpan = yearSpanFromSeries(series)

    const dataRangeCaption = dataRangeCaptionFromDates(
      series.map((p) => p.date),
      month && stationId ? `No daily means for ${stationLabel ?? 'this river'} in ${month}` : ''
    )

    const peaksPayload: { date: string; label: string; meanLevelM: number }[] = []
    if (insights.peak != null) {
      peaksPayload.push({
        date: insights.peak.date,
        label: `${formatDdMmYyyy(insights.peak.date)} ${insights.peak.meanLevelM.toFixed(2)} m`,
        meanLevelM: insights.peak.meanLevelM,
      })
    }
    if (
      insights.secondPeak != null &&
      insights.peak != null &&
      insights.secondPeak.date !== insights.peak.date
    ) {
      peaksPayload.push({
        date: insights.secondPeak.date,
        label: `${formatDdMmYyyy(insights.secondPeak.date)} ${insights.secondPeak.meanLevelM.toFixed(2)} m`,
        meanLevelM: insights.secondPeak.meanLevelM,
      })
    }

    let stabilizedDisplay: string | null = null
    if (insights.stabilizedRangeLabel != null) {
      const parts = insights.stabilizedRangeLabel.split(/\s+to\s+/)
      if (parts.length === 2 && parts[0] && parts[1]) {
        stabilizedDisplay = `from ${formatDdMmYyyy(parts[0].trim())} to ${formatDdMmYyyy(parts[1].trim())}`
      }
    }

    const peakSummaryPrimary =
      insights.peak != null
        ? `${insights.peak.meanLevelM.toFixed(2)}m on ${formatDdMmYyyy(insights.peak.date)}`
        : null

    const lowSummaryText =
      insights.low != null
        ? stabilizedDisplay != null
          ? `${insights.low.meanLevelM.toFixed(2)}m (Stabilized) ${stabilizedDisplay}`
          : `${insights.low.meanLevelM.toFixed(2)}m on ${formatDdMmYyyy(insights.low.date)}`
        : null

    return Response.json(
      {
        mode: 'single' as const,
        rangeDays,
        stationId: stationId ?? null,
        stationLabel,
        month,
        stations: stationsPayload,
        availableMonths,
        series,
        multiSeries: undefined,
        subtitle:
          series.length === 0
            ? stationLabel
              ? `[Mean Daily Water Level — ${stationLabel}]`
              : '[Mean Daily Water Level — insufficient verified data]'
            : stationLabel
              ? `[Mean Daily Water Level · ${stationLabel} · ${yearSpan}]`
              : `[Mean Daily Water Level · ${yearSpan}]`,
        dataRangeCaption,
        periodLabels: {
          displayStart: periodStartLabel,
          displayEnd: periodEndLabel,
        },
        peakSummary: peakSummaryPrimary != null ? `Historical Peak: ${peakSummaryPrimary}` : null,
        lowSummary: lowSummaryText != null ? `Historical Low: ${lowSummaryText}` : null,
        annotations: {
          peaks: peaksPayload,
        },
      },
      { headers: { 'Cache-Control': 'no-store, must-revalidate' } }
    )
  })
}
