import * as XLSX from 'xlsx'
import type { BoreholesActivityReportResponse } from '@/lib/boreholes-activity-report.types'

function cell(v: unknown): string | number {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') return v
  return String(v)
}

function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[\\/*?:[\]]/g, ' ').trim()
  return cleaned.slice(0, 31) || 'Sheet'
}

function uniqueSheetName(base: string, used: Set<string>): string {
  let name = sanitizeSheetName(base)
  if (!used.has(name)) {
    used.add(name)
    return name
  }
  let n = 2
  while (used.has(`${name.slice(0, 28)}_${n}`)) n++
  name = `${name.slice(0, 28)}_${n}`
  used.add(name)
  return name
}

export function boreholesActivityReportToWorkbook(
  report: BoreholesActivityReportResponse
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()
  const usedNames = new Set<string>()

  const summaryRows: (string | number)[][] = [
    ['Organisation', report.meta.organisation],
    ['Department', report.meta.department],
    ['Report period', report.meta.periodLabel],
    ['Period start (ISO)', report.meta.periodStart],
    ['Period end (ISO)', report.meta.periodEnd],
    ['Generated (ISO)', report.meta.generatedAt],
    ['Included sections', report.meta.includedSections.join(', ')],
    [],
    ['Executive summary', ''],
    ['Metric', 'Value'],
  ]
  for (const [k, v] of Object.entries(report.executiveSummary)) {
    summaryRows.push([k, cell(v)])
  }

  if (report.rollups.licencesByStatus?.length) {
    summaryRows.push([])
    summaryRows.push(['Licences by status (period)', ''])
    summaryRows.push(['Status', 'Count'])
    for (const r of report.rollups.licencesByStatus) {
      summaryRows.push([r.status, r.count])
    }
  }

  if (report.rollups.survey123ByStatus?.length) {
    summaryRows.push([])
    summaryRows.push(['Survey123 by status (period)', ''])
    summaryRows.push(['Status', 'Count'])
    for (const r of report.rollups.survey123ByStatus) {
      summaryRows.push([r.status, r.count])
    }
  }

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(summaryRows),
    uniqueSheetName('Summary', usedNames)
  )

  for (const block of report.activities) {
    const rows: (string | number)[][] = [[block.title]]
    if (block.narrative) rows.push([block.narrative])
    rows.push([])
    rows.push(block.columns.map((c) => c.label))
    for (const rec of block.rows) {
      rows.push(block.columns.map((c) => cell(rec[c.key])))
    }
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(rows),
      uniqueSheetName(block.title, usedNames)
    )
  }

  return wb
}

export function downloadBoreholesActivityReportXlsx(
  report: BoreholesActivityReportResponse,
  filename: string
): void {
  const wb = boreholesActivityReportToWorkbook(report)
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}
