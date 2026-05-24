import type { HydroActivityReportResponse } from '@/lib/hydro-activity-report.types'

function csvEscapeCell(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function cell(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v)
}

/** UTF-8 CSV (Excel-friendly) mirroring on-screen sections and executive summary */
export function activityReportToCsv(report: HydroActivityReportResponse): string {
  const rows: string[][] = []

  rows.push(['Organisation', report.meta.organisation])
  rows.push(['Department', report.meta.department])
  rows.push(['Report period (label)', report.meta.periodLabel])
  rows.push(['Period start (ISO)', report.meta.periodStart])
  rows.push(['Period end (ISO)', report.meta.periodEnd])
  rows.push(['Generated (ISO)', report.meta.generatedAt])
  rows.push(['Included sections', report.meta.includedSections.join(', ')])
  rows.push([])

  rows.push(['Executive summary', ''])
  rows.push(['Metric key', 'Value'])
  for (const [k, v] of Object.entries(report.executiveSummary)) {
    rows.push([k, cell(v)])
  }

  if (report.waterMonitoring) {
    rows.push([])
    rows.push(['Water monitoring (rollup)', ''])
    for (const [k, v] of Object.entries(report.waterMonitoring)) {
      rows.push([k, cell(v)])
    }
  }

  if (report.rollups.readingsByStation?.length) {
    rows.push([])
    rows.push(['Rollup: readings by station', '', ''])
    rows.push(['Station', 'Count', 'Validated'])
    for (const r of report.rollups.readingsByStation) {
      rows.push([r.stationName, cell(r.count), cell(r.validated)])
    }
  }

  if (report.rollups.paymentsByStatus?.length) {
    rows.push([])
    rows.push(['Rollup: payments by status', '', ''])
    rows.push(['Status', 'Count', 'Amount (SLE)'])
    for (const r of report.rollups.paymentsByStatus) {
      rows.push([r.status, cell(r.count), cell(r.amountSle)])
    }
  }

  for (const block of report.activities) {
    rows.push([])
    rows.push([`Section: ${block.section}`, block.title])
    if (block.narrative) rows.push(['Narrative', block.narrative])
    rows.push(block.columns.map((c) => c.label))
    for (const rec of block.rows) {
      rows.push(block.columns.map((c) => cell(rec[c.key])))
    }
  }

  return rows.map((r) => r.map(csvEscapeCell).join(',')).join('\r\n')
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
