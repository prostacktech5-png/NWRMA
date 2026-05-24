import { resolveMonitoringStationIdForReading } from '@/lib/hydro-monitoring-aggregator'
import type { MonitoringStation, WaterLevelReading } from '@/lib/types'

export type MeanDailyWaterPoint = {
  /** yyyy-mm-dd (UTC bucket) */
  date: string
  meanLevelM: number
  sampleCount: number
}

function roundMeanDailyM(value: number): number {
  return Math.round(value * 1000) / 1000
}

export type MeanDailyStationOption = {
  id: string
  name: string
  district: string
  dayCount: number
  firstDate: string
  lastDate: string
}

/** Catalogue-aligned station id for mean-daily bucketing (matches monitoring dashboard). */
export function resolveStationIdForMeanDaily(
  reading: WaterLevelReading,
  catalogStations: MonitoringStation[]
): string {
  return resolveMonitoringStationIdForReading(reading, catalogStations)
}

/**
 * Aggregate HoD-valid readings into UTC calendar-day means (average `level_m` when multiple submissions exist).
 */
export function buildMeanDailyWaterSeriesFromReadings(
  readings: WaterLevelReading[],
  opts?: {
    stationId?: string | null
    /** Only include readings with measured_at on or after this instant */
    from?: Date
    /** When set, used instead of raw `reading.stationId` for station scoping */
    resolveStationId?: (reading: WaterLevelReading) => string
  }
): MeanDailyWaterPoint[] {
  const valid = readings.filter((r) => r.hodValidation === 'valid')
  const resolve = opts?.resolveStationId ?? ((r: WaterLevelReading) => r.stationId)
  const scoped = opts?.stationId?.trim()
    ? valid.filter((r) => resolve(r) === opts.stationId)
    : valid

  const fromMs = opts?.from ? opts.from.getTime() : Number.NEGATIVE_INFINITY
  const buckets = new Map<string, number[]>()

  for (const r of scoped) {
    const t = new Date(r.measuredAt).getTime()
    if (!Number.isFinite(t) || t < fromMs) continue
    const day = new Date(r.measuredAt).toISOString().slice(0, 10)
    const bucket = buckets.get(day) ?? []
    bucket.push(r.levelM)
    buckets.set(day, bucket)
  }

  const out = [...buckets.entries()]
    .map(([date, levels]) => ({
      date,
      meanLevelM: +(levels.reduce((a, b) => a + b, 0) / levels.length).toFixed(4),
      sampleCount: levels.length,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  /** Daily means rounded for axes / labels */
  return out.map((p) => ({
    ...p,
    meanLevelM: roundMeanDailyM(p.meanLevelM),
  }))
}

/** Stations with at least one daily mean in range, sorted by river name. */
export function listStationsWithMeanDailyData(
  readings: WaterLevelReading[],
  catalogStations: MonitoringStation[],
  stationRollup: MonitoringStation[],
  opts?: { from?: Date }
): MeanDailyStationOption[] {
  const resolve = (r: WaterLevelReading) => resolveStationIdForMeanDaily(r, catalogStations)
  const rollupById = new Map(stationRollup.map((s) => [s.id, s]))

  const ids = new Set<string>()
  for (const r of readings) {
    if (r.hodValidation !== 'valid') continue
    const t = new Date(r.measuredAt).getTime()
    if (opts?.from && (!Number.isFinite(t) || t < opts.from.getTime())) continue
    ids.add(resolve(r))
  }

  const out: MeanDailyStationOption[] = []
  for (const id of ids) {
    const series = buildMeanDailyWaterSeriesFromReadings(readings, {
      stationId: id,
      from: opts?.from,
      resolveStationId: resolve,
    })
    if (!series.length) continue
    const meta = rollupById.get(id)
    const fallbackReading = readings.find(
      (r) => r.hodValidation === 'valid' && resolve(r) === id
    )
    out.push({
      id,
      name: meta?.name ?? fallbackReading?.stationName ?? id,
      district: meta?.district ?? fallbackReading?.location ?? 'Unknown district',
      dayCount: series.length,
      firstDate: series[0]!.date,
      lastDate: series[series.length - 1]!.date,
    })
  }

  return out.sort((a, b) => a.name.localeCompare(b.name))
}

export function filterMeanDailySeriesByMonth(
  series: MeanDailyWaterPoint[],
  month: string | null | undefined
): MeanDailyWaterPoint[] {
  const m = month?.trim()
  if (!m || !/^\d{4}-\d{2}$/.test(m)) return series
  return series.filter((p) => p.date.startsWith(m))
}

export function collectAvailableMonthsFromSeries(series: MeanDailyWaterPoint[]): string[] {
  const months = new Set<string>()
  for (const p of series) {
    months.add(p.date.slice(0, 7))
  }
  return [...months].sort()
}

export type MeanDailyInsights = {
  peak: MeanDailyWaterPoint | null
  secondPeak: MeanDailyWaterPoint | null
  low: MeanDailyWaterPoint | null
  stabilizedRangeLabel: string | null
}

/** Standard desk summary aligned with HoD-valid “daily mean” charts (equal weight per UTC calendar day). */
export type DailyWaterLevelStatistics = {
  /** Mean of daily mean stages */
  meanM: number
  /** Minimum daily mean in the window */
  minM: number
  /** Maximum daily mean in the window */
  maxM: number
  /** Sample standard deviation (STDDEV.S) of daily means; 0 when fewer than two days */
  stdDevM: number
  dayCount: number
}

/**
 * Mean, min, max, and sample σ across the **daily mean** series (`meanLevelM` per UTC day).
 * Reads are first bucketed into daily means by `buildMeanDailyWaterSeriesFromReadings`; this matches
 * common “daily water level statistics” templates (spreadsheet summaries over daily aggregated levels).
 */
export function deriveDailyWaterLevelStatisticsFromDailyMeans(
  points: MeanDailyWaterPoint[]
): DailyWaterLevelStatistics | null {
  if (!points.length) return null

  const values = points.map((p) => p.meanLevelM)
  const n = values.length
  const meanRaw = values.reduce((a, x) => a + x, 0) / n
  const minRaw = Math.min(...values)
  const maxRaw = Math.max(...values)

  let stdRaw = 0
  if (n >= 2) {
    const sqSum = values.reduce((s, x) => s + (x - meanRaw) ** 2, 0)
    stdRaw = Math.sqrt(sqSum / (n - 1))
  }

  return {
    meanM: roundMeanDailyM(meanRaw),
    minM: roundMeanDailyM(minRaw),
    maxM: roundMeanDailyM(maxRaw),
    stdDevM: roundMeanDailyM(stdRaw),
    dayCount: n,
  }
}

/**
 * Largest two distinct-calendar-day peaks + global low; attempts a trailing “plateau” note for stabilized low.
 */
export function deriveMeanDailyInsights(points: MeanDailyWaterPoint[]): MeanDailyInsights {
  if (!points.length) {
    return { peak: null, secondPeak: null, low: null, stabilizedRangeLabel: null }
  }

  const sortedHigh = [...points].sort((a, b) => b.meanLevelM - a.meanLevelM)
  const peak = sortedHigh[0] ?? null
  const secondPeak =
    peak != null
      ? (sortedHigh.find((p) => p.date !== peak.date && p.meanLevelM < peak.meanLevelM - 0.02) ??
        sortedHigh.find((p) => p.date !== peak.date) ??
        null)
      : null

  const sortedLow = [...points].sort((a, b) => a.meanLevelM - b.meanLevelM)
  const low = sortedLow[0] ?? null

  let stabilizedRangeLabel: string | null = null
  const tailLen = Math.min(14, points.length)
  if (tailLen >= 5) {
    const tail = points.slice(-tailLen)
    const tailValues = tail.map((p) => p.meanLevelM)
    const minT = Math.min(...tailValues)
    const maxT = Math.max(...tailValues)
    if (maxT - minT <= 0.2 && tail[0] != null && tail[tail.length - 1] != null) {
      stabilizedRangeLabel = `${tail[0].date} to ${tail[tail.length - 1].date}`
    }
  }

  return { peak, secondPeak, low, stabilizedRangeLabel }
}

export type MeanDailyMultiSeriesEntry = {
  stationId: string
  stationLabel: string
  series: MeanDailyWaterPoint[]
}

/** Union of YYYY-MM months across all station series. */
export function collectAvailableMonthsFromMultiSeries(
  multi: MeanDailyMultiSeriesEntry[]
): string[] {
  const months = new Set<string>()
  for (const entry of multi) {
    for (const p of entry.series) {
      months.add(p.date.slice(0, 7))
    }
  }
  return [...months].sort()
}

/** Pivot multi-station series into Recharts rows: `{ date, [stationId]: meanLevelM | null }`. */
export function mergeMeanDailySeriesForChart(
  multi: MeanDailyMultiSeriesEntry[]
): Array<Record<string, string | number | null>> {
  const dateSet = new Set<string>()
  for (const entry of multi) {
    for (const p of entry.series) {
      dateSet.add(p.date)
    }
  }
  const dates = [...dateSet].sort()
  const levelByStationDate = new Map(
    multi.map((entry) => [
      entry.stationId,
      new Map(entry.series.map((p) => [p.date, p.meanLevelM])),
    ])
  )

  return dates.map((date) => {
    const row: Record<string, string | number | null> = { date }
    for (const entry of multi) {
      const val = levelByStationDate.get(entry.stationId)?.get(date)
      row[entry.stationId] = val ?? null
    }
    return row
  })
}

export type GlobalMeanDailyInsight = {
  peak: (MeanDailyWaterPoint & { stationLabel: string }) | null
  low: (MeanDailyWaterPoint & { stationLabel: string }) | null
}

/** Global max/min daily mean across all rivers (for “All rivers” compare mode). */
export function deriveGlobalMeanDailyInsights(
  multi: MeanDailyMultiSeriesEntry[]
): GlobalMeanDailyInsight {
  let peak: (MeanDailyWaterPoint & { stationLabel: string }) | null = null
  let low: (MeanDailyWaterPoint & { stationLabel: string }) | null = null

  for (const entry of multi) {
    for (const p of entry.series) {
      const tagged = { ...p, stationLabel: entry.stationLabel }
      if (!peak || p.meanLevelM > peak.meanLevelM) peak = tagged
      if (!low || p.meanLevelM < low.meanLevelM) low = tagged
    }
  }

  return { peak, low }
}
