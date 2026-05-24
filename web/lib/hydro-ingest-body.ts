import type { MonitoringStation } from '@/lib/types'

/** Rejects empty strings and common JSON-null garbage from mobile clients (`"null"`, `"undefined"`). */
export function isPlaceholderIngestId(value: unknown): boolean {
  if (value == null) return true
  if (typeof value !== 'string') return true
  const t = value.trim().toLowerCase()
  return t.length === 0 || t === 'null' || t === 'undefined' || t === 'nil'
}

export function pickStr(body: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = body[k]
    if (typeof v === 'string') return v
  }
  return ''
}

export function pickNumber(body: Record<string, unknown>, ...keys: string[]): number {
  for (const k of keys) {
    const v = body[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v.replace(',', '.'))
      if (Number.isFinite(n)) return n
    }
  }
  return NaN
}

const LEVEL_M_KEYS: string[] = [
  'levelM',
  'level_m',
  'water_level',
  'waterLevel',
  'water_level_m',
  'waterLevelM',
  'river_level',
  'riverLevel',
  'current_level',
  'currentLevel',
  'observed_level',
  'observedLevel',
  'water_stage',
  'waterStage',
  'stage_m',
  'stageM',
  'gauge_level',
  'gaugeLevel',
  'gauge_reading',
  'reading_m',
  'readingM',
  'height_m',
  'heightM',
  'depth_m',
  'depthM',
  'water_depth',
  'waterDepth',
  'gaugeReading',
  'meter_reading',
  'meterReading',
  'depth',
  'level',
  'reading',
  'reading_value',
  'readingValue',
  'wl',
  'value',
]

const LEVEL_CM_KEYS: string[] = [
  'level_cm',
  'levelCm',
  'water_level_cm',
  'waterLevelCm',
  'reading_cm',
  'height_cm',
  'stage_cm',
]

/** Water level in metres — common Android / SQL naming variants; supports cm fields (÷100). */
export function pickLevelM(body: Record<string, unknown>): number {
  const m = pickNumber(body, ...LEVEL_M_KEYS)
  if (Number.isFinite(m)) return m
  const cm = pickNumber(body, ...LEVEL_CM_KEYS)
  if (Number.isFinite(cm)) return cm / 100
  return NaN
}

/** When known keys miss or resolve to `0` because of a generic `value` field, scan for hydro-like numeric keys. */
export function pickLevelMForIngest(body: Record<string, unknown>): number {
  const primary = pickLevelM(body)
  const fallback = pickLevelMFallbackScan(body)
  if (Number.isFinite(primary) && primary !== 0) return primary
  if (Number.isFinite(fallback)) return fallback
  return primary
}

function coerceNum(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') return Number(v.replace(',', '.'))
  return NaN
}

function pickLevelMFallbackScan(body: Record<string, unknown>): number {
  const nums: number[] = []
  for (const [key, val] of Object.entries(body)) {
    const lk = key.toLowerCase()
    if (
      /phone|officer|user|email|token|latitude|longitude|hod|validation|count|index|version|amount|price|rate|status/.test(
        lk
      )
    ) {
      continue
    }
    if (/_id$/i.test(lk) && !/level|reading|gauge|water|stage/.test(lk)) continue
    if (!/(level|water|stage|gauge|depth|height|meter|reading|wl|flow)/.test(lk)) continue
    const n = coerceNum(val)
    if (!Number.isFinite(n) || n < -150 || n > 500_000) continue
    nums.push(n)
  }
  if (nums.length === 0) return NaN
  const plausible = nums.filter((n) => n >= -50 && n <= 500)
  const pool = plausible.length > 0 ? plausible : nums
  return Math.max(...pool)
}

/** Single GPS line or lat/lng pair from typical mobile payloads. */
export function pickGpsForIngest(body: Record<string, unknown>): string {
  const direct = pickGpsLine(body).trim()
  if (direct) return direct
  return pickGpsFallbackScan(body)
}

function pickGpsFallbackScan(body: Record<string, unknown>): string {
  let lat = NaN
  let lng = NaN
  for (const [key, val] of Object.entries(body)) {
    const lk = key.toLowerCase()
    if (/plat|relat|format/.test(lk)) continue
    if ((/\blat\b/.test(lk) || lk.endsWith('lat') || lk.includes('latitude')) && !lk.includes('long')) {
      const n = coerceNum(val)
      if (Number.isFinite(n) && Math.abs(n) <= 90) lat = n
    }
    if (/\blng\b/.test(lk) || /\blon\b/.test(lk) || lk.includes('longitude')) {
      const n = coerceNum(val)
      if (Number.isFinite(n) && Math.abs(n) <= 180) lng = n
    }
  }
  if (Number.isFinite(lat) && Number.isFinite(lng)) return `${lat}, ${lng}`
  return ''
}

export function pickMeasuredAtForIngest(body: Record<string, unknown>): Date {
  return (
    pickMeasuredAtFromBody(body) ??
    pickMeasuredAtFallbackScan(body) ??
    new Date()
  )
}

function pickMeasuredAtFallbackScan(body: Record<string, unknown>): Date | null {
  for (const [k, v] of Object.entries(body)) {
    const lk = k.toLowerCase()
    if (/phone|email|token|password|apikey|officer|name|location|address|district|title|description/.test(lk)) continue
    if (!/instant|observ|measur|record|captur|stamp|datetime|date|time|when|at$|_at$/.test(lk)) continue
    if (v instanceof Date && !Number.isNaN(v.getTime())) return v
    if (typeof v === 'number' && Number.isFinite(v)) {
      const d = dateFromUnixish(v)
      if (d) return d
    }
    if (typeof v === 'string' && v.trim()) {
      if (/^\d{10,13}$/.test(v.trim())) {
        const d = dateFromUnixish(Number(v))
        if (d) return d
      }
      if (/^\d{1,2}:\d{2}/.test(v.trim()) && !/\d{4}-\d{2}-\d{2}/.test(v)) continue
      const d = new Date(v.trim())
      if (!Number.isNaN(d.getTime())) return d
    }
  }
  return null
}

export function pickGpsLine(body: Record<string, unknown>): string {
  const direct = pickStr(
    body,
    'gpsLocation',
    'gps_location',
    'gps',
    'coordinates',
    'coordinate',
    'geo',
    'location_gps',
    'gpsCoordinates',
    'gps_coordinates'
  ).trim()
  if (direct) return direct

  const latStr = pickStr(body, 'latitude', 'lat', 'gps_lat', 'gpsLatitude', 'gps_latitude')
  const lngStr = pickStr(body, 'longitude', 'lng', 'lon', 'long', 'gps_lng', 'gpsLongitude', 'gps_longitude')
  if (latStr && lngStr) {
    const lat = Number(latStr.replace(',', '.'))
    const lng = Number(lngStr.replace(',', '.'))
    if (Number.isFinite(lat) && Number.isFinite(lng)) return `${lat}, ${lng}`
  }

  const lat = pickNumber(body, 'latitude', 'lat', 'gps_lat', 'gpsLat', 'gps_latitude', 'y')
  const lng = pickNumber(body, 'longitude', 'lng', 'lon', 'long', 'gps_lng', 'gpsLng', 'gps_longitude', 'x')
  if (Number.isFinite(lat) && Number.isFinite(lng)) return `${lat}, ${lng}`

  const loc = body.location
  if (loc && typeof loc === 'object' && !Array.isArray(loc)) {
    const o = loc as Record<string, unknown>
    const la = pickNumber(o, 'latitude', 'lat', 'Latitude')
    const ln = pickNumber(o, 'longitude', 'lng', 'lon', 'long', 'Longitude')
    if (Number.isFinite(la) && Number.isFinite(ln)) return `${la}, ${ln}`
  }

  return ''
}

/**
 * Parse observation time from ISO strings, Unix ms/sec numbers, or separate date/time fields (Android).
 */
function dateFromUnixish(v: number): Date | null {
  const ms = v > 1e12 ? v : v > 1e9 ? v * 1000 : v
  const d = new Date(ms)
  return Number.isNaN(d.getTime()) ? null : d
}

export function pickMeasuredAtFromBody(body: Record<string, unknown>): Date | null {
  const numericKeys = [
    'measuredAt',
    'measured_at',
    'timestamp',
    'readingTimestamp',
    'time',
    'date_time',
    'datetime',
    'observation_time',
  ] as const
  for (const key of numericKeys) {
    const v = body[key]
    if (typeof v === 'number' && Number.isFinite(v)) {
      const d = dateFromUnixish(v)
      if (d) return d
    }
    if (typeof v === 'string' && /^\d{10,13}$/.test(v.trim())) {
      const d = dateFromUnixish(Number(v))
      if (d) return d
    }
  }

  const fromMsKeys = ['measuredAtMs', 'measured_at_ms', 'timestamp_ms', 'reading_time_ms'] as const
  for (const key of fromMsKeys) {
    const v = body[key]
    if (typeof v === 'number' && Number.isFinite(v)) {
      const d = new Date(v)
      if (!Number.isNaN(d.getTime())) return d
    }
  }

  const secKeys = ['unix_timestamp', 'unixTimestamp', 'measured_at_seconds', 'ts', 'epoch'] as const
  for (const key of secKeys) {
    const v = body[key]
    if (typeof v === 'number' && Number.isFinite(v) && v > 1e8 && v < 1e11) {
      const d = new Date(v * 1000)
      if (!Number.isNaN(d.getTime())) return d
    }
  }

  const iso = pickStr(
    body,
    'measuredAt',
    'measured_at',
    'readingTimestamp',
    'reading_timestamp',
    'observationTime',
    'observation_time',
    'timestamp_iso',
    'datetime',
    'dateTime',
    'date_time'
  ).trim()
  if (iso) {
    if (/^\d{10,13}$/.test(iso)) {
      const n = Number(iso)
      const ms = n > 1e12 ? n : n * 1000
      const d = new Date(ms)
      if (!Number.isNaN(d.getTime())) return d
    }
    const d = new Date(iso)
    if (!Number.isNaN(d.getTime())) return d
  }

  const datePart = pickStr(
    body,
    'reading_date',
    'readingDate',
    'measurement_date',
    'measurementDate',
    'survey_date',
    'date'
  ).trim()
  const timePart = pickStr(body, 'reading_time', 'readingTime', 'time_only', 'time').trim()
  if (datePart && timePart) {
    const t =
      timePart.length === 5
        ? `${timePart}:00`
        : timePart.length === 8
          ? timePart
          : timePart
    const combined = `${datePart}T${t}`
    const d = new Date(combined)
    if (!Number.isNaN(d.getTime())) return d
  }

  if (datePart && !timePart) {
    const d = new Date(`${datePart}T12:00:00`)
    if (!Number.isNaN(d.getTime())) return d
  }

  return null
}

const NEST_PAYLOAD_KEYS = new Set([
  'reading',
  'data',
  'payload',
  'measurement',
  'fields',
  'readingData',
  'reading_data',
  'readingDetails',
  'reading_details',
  'body',
  'submission',
  'content',
  'result',
  'record',
  'form',
  'request',
])

function isPlainRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v)
}

/**
 * Merge nested JSON so pickLevelM / GPS / time see a flat object.
 * Deeper values win over shallower ones (root `level: 0` cannot wipe `{ reading: { level: 2.1 } }`).
 * Same depth: last in iteration order wins.
 */
export function flattenIngestBody(body: Record<string, unknown>): Record<string, unknown> {
  const best = new Map<string, { v: unknown; depth: number }>()

  function walk(node: Record<string, unknown>, depth: number) {
    for (const [k, v] of Object.entries(node)) {
      if (NEST_PAYLOAD_KEYS.has(k) && isPlainRecord(v)) {
        walk(v as Record<string, unknown>, depth + 1)
      } else {
        const prev = best.get(k)
        if (!prev || depth > prev.depth || depth === prev.depth) {
          best.set(k, { v, depth })
        }
      }
    }
  }

  walk(body, 0)
  const out: Record<string, unknown> = {}
  for (const [k, { v }] of best) out[k] = v
  return out
}

export type ParseIngestBodyResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; reason: 'empty_body' | 'invalid_body' | 'invalid_json' }

function recordFromUrlSearchParams(params: URLSearchParams): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of new Set(params.keys())) {
    const all = params.getAll(key)
    const last = all[all.length - 1]
    if (last != null) out[key] = last
  }
  return out
}

/**
 * Read ingest POST body as JSON, `application/x-www-form-urlencoded`, or `multipart/form-data` (string fields only).
 */
export async function parseIngestBodyFromRequest(req: Request): Promise<ParseIngestBodyResult> {
  const ct = req.headers.get('content-type')?.toLowerCase() ?? ''

  if (ct.includes('application/x-www-form-urlencoded')) {
    let text: string
    try {
      text = await req.text()
    } catch {
      return { ok: false, reason: 'invalid_body' }
    }
    if (!text.trim()) return { ok: false, reason: 'empty_body' }
    const flat = recordFromUrlSearchParams(new URLSearchParams(text))
    if (Object.keys(flat).length === 0) return { ok: false, reason: 'empty_body' }
    return { ok: true, body: flattenIngestBody(flat) }
  }

  if (ct.includes('multipart/form-data')) {
    let fd: FormData
    try {
      fd = await req.formData()
    } catch {
      return { ok: false, reason: 'invalid_body' }
    }
    const flat: Record<string, unknown> = {}
    for (const [k, v] of fd.entries()) {
      if (typeof v === 'string') flat[k] = v
    }
    if (Object.keys(flat).length === 0) return { ok: false, reason: 'empty_body' }
    return { ok: true, body: flattenIngestBody(flat) }
  }

  let text: string
  try {
    text = await req.text()
  } catch {
    return { ok: false, reason: 'invalid_body' }
  }
  const trimmed = text.trim()
  if (!trimmed) return { ok: false, reason: 'empty_body' }
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return { ok: false, reason: 'invalid_json' }
  }
  if (!isPlainRecord(parsed)) return { ok: false, reason: 'invalid_json' }
  return { ok: true, body: flattenIngestBody(parsed) }
}

/**
 * Prefer ERP-catalog stations; for authenticated field apps, allow any non-placeholder `stationId` when
 * `stationName` is provided (gauge sites not yet mirrored in the web bundle).
 */
export function resolveStationForReadingIngest(
  catalog: MonitoringStation[],
  opts: {
    stationId: string
    stationName: string
    stationDistrict: string
    viaApiKey: boolean
  }
): { ok: true; station: MonitoringStation } | { ok: false; error: string; hint?: string } {
  const trimmedId = opts.stationId.trim()
  const fromCatalog = catalog.find((s) => s.id === trimmedId)
  if (fromCatalog) {
    return { ok: true, station: fromCatalog }
  }

  if (!opts.viaApiKey) {
    return {
      ok: false,
      error: 'unknown_station',
      hint:
        'Use a configured station id (see ERP /hydrological), or submit readings from the field app with stationId, stationName, and the Hydro API key.',
    }
  }

  const name = opts.stationName.trim()
  if (isPlaceholderIngestId(name)) {
    return {
      ok: false,
      error: 'unknown_station',
      hint:
        'Field app must send stationId and stationName for this gauge (station is not in the built-in catalog).',
    }
  }

  const district = opts.stationDistrict.trim() || name
  const synthetic: MonitoringStation = {
    id: trimmedId,
    name,
    code: '',
    lat: null,
    lng: null,
    district,
    notes: 'Submitted from field app (station not in built-in catalog)',
    status: 'active',
    alertThresholdM: 0,
  }
  return { ok: true, station: synthetic }
}
