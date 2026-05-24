import type { MonitoringStation, WaterLevelReading } from '@/lib/types'
import {
  medianLevels,
  regressionSlopeMPerDay,
  sliceLastForOperational,
} from '@/lib/hydro-monitoring-operational-stats'

/**
 * Hydrometric snapshot from the readings register (**HoD-valid only**).
 * Pending rows await review; rejected rows are excluded.
 * `latestStageM` is the raw latest validated point; `operationalStageM` is the median of the last
 * up to 5 validated readings for display / flood % (smoothing).
 */

export type StationMonitoringSnapshot = {
  stationId: string
  /** Latest validated water level (stage) in metres — raw most recent point */
  latestStageM: number | null
  latestMeasuredAt: string | null
  /** Median of last up to 5 validated stages (operational display / risk); null if no readings */
  operationalStageM: number | null
  /** Count of validated readings used for `operationalStageM` (1–5) */
  operationalSampleCount: number
  /** Number of validated readings with measuredAt in [windowStart, now] */
  validatedCountInWindow: number
  /** Arithmetic mean of validated stages in window (null if none) */
  meanStageM: number | null
  /** Linear regression slope (m/day) over last up to 5 validated readings vs time */
  rateOfChangeMPerDay: number | null
  /** Min / max validated stage in window */
  minStageM: number | null
  maxStageM: number | null
  /** Last validated levels (chronological, max 14) for trend sparkline */
  sparklineLevels: number[]
  /** Parsed from latest valid reading gpsLocation when possible (map prefers this over registry) */
  readingLat: number | null
  readingLng: number | null
}

export type StageStatusBand = 'low' | 'medium' | 'high'

/** Percentage of action / flood-watch threshold (stage ÷ threshold × 100). */
export function stagePercentOfThreshold(stageM: number, thresholdM: number): number {
  if (thresholdM <= 0) return 0
  return Math.round((stageM / thresholdM) * 1000) / 10
}

/** Band thresholds: under 70% Low, 70–85% Medium, 85%+ High. */
export function statusBandFromPct(pct: number): StageStatusBand {
  if (pct < 70) return 'low'
  if (pct < 85) return 'medium'
  return 'high'
}

/** Normalise free-text localities for matching readings to ERP station rows. */
export function normalizeHydrologicalLocationKey(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function scoreReadingHintAgainstStation(
  hintNorm: string,
  districtNorm: string,
  nameNorm: string
): number {
  if (!hintNorm) return 0
  if (hintNorm === districtNorm) return 100
  if (hintNorm === nameNorm) return 92

  let score = 0
  if (
    hintNorm.length >= 2 &&
    districtNorm.length >= 2 &&
    (hintNorm.includes(districtNorm) || districtNorm.includes(hintNorm))
  ) {
    score = Math.max(score, 72)
  }
  if (
    hintNorm.length >= 3 &&
    districtNorm.length >= 3 &&
    (hintNorm.includes(districtNorm) || districtNorm.includes(hintNorm))
  ) {
    score = Math.max(score, 78)
  }
  if (
    hintNorm.length >= 4 &&
    nameNorm.length >= 4 &&
    (hintNorm.includes(nameNorm) || nameNorm.includes(hintNorm))
  ) {
    score = Math.max(score, 62)
  }
  return score
}

const LOCATION_SPLIT_RX = /[,;/|\u2013\u2014]+/

/** Hints extracted from locality / station naming for catalogue matching. */
export function collectReadingLocationHints(reading: WaterLevelReading): Set<string> {
  const hints = new Set<string>()

  function ingest(raw: string) {
    const n = normalizeHydrologicalLocationKey(raw)
    if (n) hints.add(n)
    for (const part of raw.split(LOCATION_SPLIT_RX)) {
      const p = normalizeHydrologicalLocationKey(part)
      if (p) hints.add(p)
    }
  }

  ingest(reading.location)
  ingest(reading.stationName)

  if (reading.stationId.startsWith('field:')) {
    const rest = reading.stationId.slice(6)
    const pipe = rest.indexOf('|')
    ingest(pipe >= 0 ? rest.slice(pipe + 1) : rest)
  }

  const strippedRiver = reading.stationName.replace(/^River:\s*/i, '').trim()
  ingest(strippedRiver)

  return hints
}

function sortCatalogByActiveFirst(catalogStations: MonitoringStation[]): MonitoringStation[] {
  return [...catalogStations].sort((a, b) => {
    if (a.status === b.status) return 0
    return a.status === 'active' ? -1 : 1
  })
}

/**
 * Best ERP catalogue row for a reading (district / river / locality overlap).
 */
export function findBestCatalogStationForReading(
  reading: WaterLevelReading,
  catalogStations: MonitoringStation[]
): { station: MonitoringStation; score: number } | null {
  if (!catalogStations.length) return null

  const hints = collectReadingLocationHints(reading)
  if (!hints.size) return null

  const ordered = sortCatalogByActiveFirst(catalogStations)
  let bestStation: MonitoringStation | null = null
  let bestScore = 0

  for (const station of ordered) {
    const dNorm = normalizeHydrologicalLocationKey(station.district)
    const nNorm = normalizeHydrologicalLocationKey(station.name)
    for (const h of hints) {
      const sc = scoreReadingHintAgainstStation(h, dNorm, nNorm)
      if (sc === 0) continue
      if (!bestStation || sc > bestScore) {
        bestScore = sc
        bestStation = station
      } else if (
        sc === bestScore &&
        station.status === 'active' &&
        bestStation.status !== 'active'
      ) {
        bestStation = station
      }
    }
  }

  if (!bestStation || bestScore === 0) return null
  return { station: bestStation, score: bestScore }
}

function medianPositiveAlertThresholdFromCatalog(catalog: MonitoringStation[]): number {
  const list = [...new Set(catalog.map((s) => s.alertThresholdM).filter((t) => t > 0))].sort((a, b) => a - b)
  if (!list.length) return 6
  return list[Math.floor(list.length / 2)]
}

/** After ingest / field merge, gauges may legitimately lack a threshold (`0`). Copy from overlapping catalogue gauges for flood-risk maths. */
function patchRollupStationsThresholdsAndCodes(
  rollup: MonitoringStation[],
  catalogOnly: MonitoringStation[],
  readingsByResolvedStation: Map<string, WaterLevelReading[]>
): MonitoringStation[] {
  const catalogueThresholdFallback = medianPositiveAlertThresholdFromCatalog(catalogOnly)

  return rollup.map((s) => {
    const list = readingsByResolvedStation.get(s.id)
    const reading =
      list && list.length > 0
        ? [...list].sort(
            (a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime()
          ).at(-1)!
        : undefined

    const match = reading ? findBestCatalogStationForReading(reading, catalogOnly) : null

    let thr = s.alertThresholdM
    if (!Number.isFinite(thr) || thr <= 0) {
      thr =
        match?.station.alertThresholdM &&
        match.station.alertThresholdM > 0 &&
        match.score >= 50
          ? match.station.alertThresholdM
          : catalogueThresholdFallback
    }

    const code =
      (s.code && String(s.code).trim()) ||
      (match?.station?.code && match.score >= 50 ? match.station.code : '')

    let lat = s.lat
    let lng = s.lng
    if (
      lat == null &&
      lng == null &&
      match &&
      match.score >= 50 &&
      match.station.lat != null &&
      match.station.lng != null
    ) {
      lat = match.station.lat
      lng = match.station.lng
    }

    return {
      ...s,
      alertThresholdM: thr > 0 ? thr : catalogueThresholdFallback,
      code,
      lat,
      lng,
    }
  })
}

/**
 * Map NWRMA field rows (`field:*` ids, or unknown ids) onto ERP **`MonitoringStation.id`** when the locality text matches catalogue `district` / `name`.
 * Falls back to the reading's own `stationId` when nothing matches closely enough.
 */
export function resolveMonitoringStationIdForReading(
  reading: WaterLevelReading,
  catalogStations: MonitoringStation[]
): string {
  const catalogIds = new Set(catalogStations.map((s) => s.id))
  if (catalogIds.has(reading.stationId)) {
    return reading.stationId
  }

  const matched = findBestCatalogStationForReading(reading, catalogStations)

  /** Slightly permissive remap so locality labels like “Kenema district” collapse onto one catalogue gauge without synthesising orphan `0`-threshold rows. */
  if (matched && matched.score >= 55) {
    return matched.station.id
  }
  return reading.stationId
}

function syntheticStationsFromOrphanValidatedReadings(
  catalogStations: MonitoringStation[],
  accepted: WaterLevelReading[]
): MonitoringStation[] {
  const catalogIds = new Set(catalogStations.map((s) => s.id))
  const synth: MonitoringStation[] = []
  const seenSynthId = new Set<string>()
  const catalogueThresholdFallback = medianPositiveAlertThresholdFromCatalog(catalogStations)

  for (const r of accepted) {
    const mappedId = resolveMonitoringStationIdForReading(r, catalogStations)
    if (catalogIds.has(mappedId)) continue
    if (seenSynthId.has(mappedId)) continue
    seenSynthId.add(mappedId)
    const gps = parseReadingGpsToLatLng(r.gpsLocation)
    const inferred = findBestCatalogStationForReading(r, catalogStations)
    const thrRaw =
      inferred?.station.alertThresholdM && inferred.score >= 50
        ? inferred.station.alertThresholdM
        : catalogueThresholdFallback
    synth.push({
      id: mappedId,
      name: r.stationName.trim() || r.location.trim() || 'Field gauge',
      code: inferred?.station.alertThresholdM && inferred.score >= 50 ? inferred.station.code : '',
      lat: gps?.lat ?? inferred?.station?.lat ?? null,
      lng: gps?.lng ?? inferred?.station?.lng ?? null,
      district: r.location.trim() || 'Unknown district',
      notes: 'Gauge inferred from validated readings only (outside ERP catalogue)',
      status: 'active',
      alertThresholdM: thrRaw > 0 ? thrRaw : catalogueThresholdFallback,
    })
  }

  return synth
}

/** Catalogue rows plus any synthetic gauges needed so HoD-valid readings always have a monitoring row (before threshold patch pass). */
export function rollupMonitoringStationsForSnapshots(
  catalogStations: MonitoringStation[],
  allReadings: WaterLevelReading[]
): MonitoringStation[] {
  const accepted = allReadings.filter((r) => r.hodValidation === 'valid')
  return [...catalogStations, ...syntheticStationsFromOrphanValidatedReadings(catalogStations, accepted)]
}

/**
 * Single source of truth: resolved station ids ↔ HoD-valid readings, plus rollup rows with sane `alertThresholdM`
 * so flood % and gauges never sit at 0 % solely because ingest used a provisional row.
 */
export function resolveMonitoringRollupWithThresholds(
  catalogStations: MonitoringStation[],
  allReadings: WaterLevelReading[]
): {
  stationRollup: MonitoringStation[]
  readingsByResolvedStationId: Map<string, WaterLevelReading[]>
} {
  const accepted = allReadings.filter((r) => r.hodValidation === 'valid')
  const rollupRaw = rollupMonitoringStationsForSnapshots(catalogStations, allReadings)
  const readingsByResolvedStationId = new Map<string, WaterLevelReading[]>()
  for (const r of accepted) {
    const key = resolveMonitoringStationIdForReading(r, catalogStations)
    const list = readingsByResolvedStationId.get(key) ?? []
    list.push(r)
    readingsByResolvedStationId.set(key, list)
  }
  const stationRollup = patchRollupStationsThresholdsAndCodes(
    rollupRaw,
    catalogStations,
    readingsByResolvedStationId
  )
  return { stationRollup, readingsByResolvedStationId }
}

function mean(nums: number[]): number | null {
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

/**
 * Best-effort parse for field GPS strings (e.g. "8.4657, -13.2317", "8.4521° N, 13.2897° W").
 * Uses comma/semicolon segments so N/S/E/W apply to the correct coordinate.
 */
export function parseReadingGpsToLatLng(gps: string | null | undefined): {
  lat: number
  lng: number
} | null {
  if (gps == null || typeof gps !== 'string') return null
  const t = gps.trim()
  const segments = t.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
  let lat: number
  let lng: number

  if (segments.length >= 2) {
    const m0 = segments[0].match(/-?\d+(?:\.\d+)?/)
    const m1 = segments[1].match(/-?\d+(?:\.\d+)?/)
    if (!m0 || !m1) return null
    lat = Number(m0[0])
    lng = Number(m1[0])
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    if (/S/i.test(segments[0])) lat = -Math.abs(lat)
    if (/N/i.test(segments[0]) && lat < 0) lat = Math.abs(lat)
    if (/W/i.test(segments[1])) lng = lng > 0 ? -Math.abs(lng) : lng
    if (/E/i.test(segments[1]) && lng < 0) lng = Math.abs(lng)
  } else {
    const nums = t.match(/-?\d+(?:\.\d+)?/g)
    if (!nums || nums.length < 2) return null
    lat = Number(nums[0])
    lng = Number(nums[1])
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    if (Math.abs(lng) <= 90 && Math.abs(lat) <= 180 && Math.abs(lat) > 90) {
      const swap = lat
      lat = lng
      lng = swap
    }
  }

  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat, lng }
}

function fillStationMonitoringSnapshotsFromRollup(
  stationRollup: MonitoringStation[],
  readingsByResolvedStationId: Map<string, WaterLevelReading[]>,
  options?: { windowDays?: number; now?: Date }
): Map<string, StationMonitoringSnapshot> {
  const windowDays = options?.windowDays ?? 30
  const now = options?.now ?? new Date()
  const windowStart = new Date(now)
  windowStart.setDate(windowStart.getDate() - windowDays)
  const windowStartMs = windowStart.getTime()

  const map = new Map<string, StationMonitoringSnapshot>()
  for (const s of stationRollup) {
    const list = (readingsByResolvedStationId.get(s.id) ?? []).slice()
    list.sort(
      (a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime()
    )

    const inWindow = list.filter(
      (r) => new Date(r.measuredAt).getTime() >= windowStartMs
    )

    const latest = list.length ? list[list.length - 1] : null
    const levelsWindow = inWindow.map((r) => r.levelM)
    const sparklineLevels = list.slice(-14).map((r) => r.levelM)

    const operationalReadings = sliceLastForOperational(list)
    const operationalLevels = operationalReadings.map((r) => r.levelM)
    const operationalStageM = medianLevels(operationalLevels)
    const operationalSampleCount = operationalReadings.length

    const regPoints = operationalReadings.map((r) => ({
      tMs: new Date(r.measuredAt).getTime(),
      y: r.levelM,
    }))
    const rateMPerDay = regressionSlopeMPerDay(regPoints)

    const gps = latest ? parseReadingGpsToLatLng(latest.gpsLocation) : null

    map.set(s.id, {
      stationId: s.id,
      latestStageM: latest ? latest.levelM : null,
      latestMeasuredAt: latest ? new Date(latest.measuredAt).toISOString() : null,
      operationalStageM,
      operationalSampleCount,
      validatedCountInWindow: inWindow.length,
      meanStageM: mean(levelsWindow),
      rateOfChangeMPerDay: rateMPerDay,
      minStageM: levelsWindow.length ? Math.min(...levelsWindow) : null,
      maxStageM: levelsWindow.length ? Math.max(...levelsWindow) : null,
      sparklineLevels,
      readingLat: gps?.lat ?? null,
      readingLng: gps?.lng ?? null,
    })
  }

  return map
}

/** Rollup stations + snapshots in one pass (avoids patched vs unpatched divergence between API list and gauges). */
export function buildMonitoringRollupSnapshots(
  catalogStations: MonitoringStation[],
  allReadings: WaterLevelReading[],
  options?: { windowDays?: number; now?: Date }
): {
  stationRollup: MonitoringStation[]
  snapshots: Map<string, StationMonitoringSnapshot>
} {
  const { stationRollup, readingsByResolvedStationId } = resolveMonitoringRollupWithThresholds(
    catalogStations,
    allReadings
  )
  return {
    stationRollup,
    snapshots: fillStationMonitoringSnapshotsFromRollup(stationRollup, readingsByResolvedStationId, options),
  }
}

export function buildStationMonitoringSnapshots(
  stations: MonitoringStation[],
  allReadings: WaterLevelReading[],
  options?: { windowDays?: number; now?: Date }
): Map<string, StationMonitoringSnapshot> {
  return buildMonitoringRollupSnapshots(stations, allReadings, options).snapshots
}
