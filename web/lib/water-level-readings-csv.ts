import type { WaterLevelReading } from '@/lib/types'
import { formatDate, formatTime } from '@/lib/mock-data'
import { downloadCsv as triggerCsvDownload } from '@/lib/hydro-activity-report-csv'

function csvEscapeCell(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function hodLabel(v: WaterLevelReading['hodValidation']): string {
  if (v === 'valid') return 'Valid'
  if (v === 'rejected') return 'Reject'
  return 'Pending'
}

export const WATER_LEVEL_READING_HEADERS = [
  'Officer',
  'Phone',
  'Location',
  'Station',
  'Level (m)',
  'Time',
  'Date',
  'GPS',
  'HoD validation',
] as const

export function waterLevelReadingTableRows(readings: WaterLevelReading[]): string[][] {
  return readings.map((r) => [
    r.officerName,
    r.phoneNumber,
    r.location,
    r.stationName,
    r.levelM.toFixed(2),
    formatTime(r.measuredAt),
    formatDate(r.measuredAt),
    r.gpsLocation,
    hodLabel(r.hodValidation),
  ])
}

export function waterLevelReadingsToCsv(readings: WaterLevelReading[]): string {
  const rows = waterLevelReadingTableRows(readings)
  return [WATER_LEVEL_READING_HEADERS, ...rows]
    .map((row) => row.map((c) => csvEscapeCell(String(c))).join(','))
    .join('\r\n')
}

export function downloadWaterLevelReadingsCsv(filename: string, readings: WaterLevelReading[]) {
  triggerCsvDownload(filename, waterLevelReadingsToCsv(readings))
}

export type ReadingPeriodFilter = 'all' | 'day' | 'week' | 'month'

export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function endOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

/** Week starts Monday (ISO-style). */
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  return x
}

export function endOfWeek(d: Date): Date {
  const start = startOfWeek(d)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}

export function readingMatchesPeriod(
  reading: WaterLevelReading,
  period: ReadingPeriodFilter,
  anchor: Date
): boolean {
  if (period === 'all') return true
  const t = reading.measuredAt.getTime()
  if (period === 'day') {
    return t >= startOfDay(anchor).getTime() && t <= endOfDay(anchor).getTime()
  }
  if (period === 'week') {
    return t >= startOfWeek(anchor).getTime() && t <= endOfWeek(anchor).getTime()
  }
  if (period === 'month') {
    return t >= startOfMonth(anchor).getTime() && t <= endOfMonth(anchor).getTime()
  }
  return true
}

export function toDateInputValue(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function toMonthInputValue(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function buildReadingsExportFilename(
  period: ReadingPeriodFilter,
  anchor: Date,
  location: string,
  ext: 'pdf' | 'xlsx'
): string {
  const stamp = toDateInputValue(new Date())
  const parts = ['water-level-readings', stamp]
  if (period !== 'all') parts.push(period)
  if (period === 'month') parts.push(toMonthInputValue(anchor))
  else if (period !== 'all') parts.push(toDateInputValue(anchor))
  if (location !== 'all') {
    parts.push(location.replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '').slice(0, 40))
  }
  return `${parts.join('-')}.${ext}`
}

export function buildReadingsFilterLabel(
  period: ReadingPeriodFilter,
  anchor: Date,
  location: string
): string {
  const parts: string[] = []
  if (period === 'day') parts.push(`Day: ${formatDate(anchor)}`)
  else if (period === 'week') {
    parts.push(
      `Week: ${formatDate(startOfWeek(anchor))} – ${formatDate(endOfWeek(anchor))}`
    )
  } else if (period === 'month') {
    parts.push(`Month: ${toMonthInputValue(anchor)}`)
  } else {
    parts.push('Period: All time')
  }
  parts.push(location === 'all' ? 'Location: All locations' : `Location: ${location}`)
  return parts.join(' · ')
}
