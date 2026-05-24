import * as XLSX from 'xlsx'
import type { WaterLevelReading } from '@/lib/types'
import { formatDate, formatTime } from '@/lib/mock-data'
import {
  WATER_LEVEL_READING_HEADERS,
  waterLevelReadingTableRows,
} from '@/lib/water-level-readings-csv'
import type { WaterReadingsExportMeta } from '@/lib/water-level-readings-export-meta'

export function downloadWaterLevelReadingsXlsx(
  filename: string,
  readings: WaterLevelReading[],
  filterLabel: string,
  meta: WaterReadingsExportMeta
): void {
  const wb = XLSX.utils.book_new()
  const colCount = WATER_LEVEL_READING_HEADERS.length
  const blankRow = Array<string>(colCount).fill('')

  const rows: (string | number)[][] = [
    [meta.organisation, ...blankRow.slice(1)],
    [`Department: ${meta.department}`, ...blankRow.slice(1)],
    [meta.reportTitle, ...blankRow.slice(1)],
    [meta.reportSubtitle, ...blankRow.slice(1)],
    blankRow,
    ['Generated', `${formatDate(new Date())} ${formatTime(new Date())}`, ...blankRow.slice(2)],
    ['Filters', filterLabel, ...blankRow.slice(2)],
    ['Total readings', readings.length, ...blankRow.slice(2)],
    blankRow,
    ['Reading history', ...blankRow.slice(1)],
    blankRow,
    [...WATER_LEVEL_READING_HEADERS],
    ...waterLevelReadingTableRows(readings),
  ]

  const sheet = XLSX.utils.aoa_to_sheet(rows)
  sheet['!cols'] = [
    { wch: 24 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
    { wch: 28 },
    { wch: 14 },
  ]

  sheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: colCount - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: colCount - 1 } },
    { s: { r: 9, c: 0 }, e: { r: 9, c: colCount - 1 } },
  ]

  XLSX.utils.book_append_sheet(wb, sheet, 'Readings')
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}
