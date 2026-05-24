import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { WaterLevelReading } from '@/lib/types'
import { formatDate, formatTime } from '@/lib/mock-data'
import type { ReportPdfLogo } from '@/lib/hydro-activity-report-pdf-logo'
import {
  WATER_LEVEL_READING_HEADERS,
  waterLevelReadingTableRows,
} from '@/lib/water-level-readings-csv'
import type { WaterReadingsExportMeta } from '@/lib/water-level-readings-export-meta'
import { WATER_READINGS_PDF_FOOTER } from '@/lib/water-level-readings-export-meta'

const PDF_THEME = {
  headerGreen: [40, 167, 69] as [number, number, number],
  titleText: [33, 37, 41] as [number, number, number],
  subtitleText: [102, 102, 102] as [number, number, number],
  bodyText: [51, 51, 51] as [number, number, number],
  ruleGray: [208, 208, 208] as [number, number, number],
  zebraStripe: [248, 249, 250] as [number, number, number],
}

export type WaterReadingsPdfOptions = {
  logo?: ReportPdfLogo | null
  meta: WaterReadingsExportMeta
}

function drawBrandedHeader(
  doc: jsPDF,
  meta: WaterReadingsExportMeta,
  logo: ReportPdfLogo | null | undefined,
  margin: number,
  pageW: number
): number {
  const logoMm = 24
  const gap = 6
  const textX = logo ? margin + logoMm + gap : margin
  let lineY = margin + 7

  if (logo) {
    try {
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(margin - 0.5, margin - 0.5, logoMm + 1, logoMm + 1, 3, 3, 'F')
      doc.setDrawColor(...PDF_THEME.ruleGray)
      doc.setLineWidth(0.25)
      doc.roundedRect(margin - 0.5, margin - 0.5, logoMm + 1, logoMm + 1, 3, 3, 'S')
      doc.addImage(logo.base64, logo.format, margin, margin, logoMm, logoMm)
    } catch {
      /* invalid image data */
    }
  }

  doc.setTextColor(...PDF_THEME.titleText)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  const orgLines = doc.splitTextToSize(meta.organisation, pageW - textX - margin) as string[]
  doc.text(orgLines, textX, lineY)
  lineY += orgLines.length * 5.2

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...PDF_THEME.subtitleText)
  doc.text(`Department: ${meta.department}`, textX, lineY)
  lineY += 5.5

  doc.setTextColor(...PDF_THEME.bodyText)
  const headerBottom = Math.max(margin + logoMm + 1, lineY) + 3
  doc.setDrawColor(...PDF_THEME.ruleGray)
  doc.setLineWidth(0.35)
  doc.line(margin, headerBottom, pageW - margin, headerBottom)
  return headerBottom + 6
}

function drawReportHeading(doc: jsPDF, meta: WaterReadingsExportMeta, y: number, margin: number, pageW: number): number {
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...PDF_THEME.titleText)
  doc.text(meta.reportTitle.toUpperCase(), margin, y)
  y += 5.5

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...PDF_THEME.subtitleText)
  const subLines = doc.splitTextToSize(meta.reportSubtitle, pageW - margin * 2) as string[]
  doc.text(subLines, margin, y)
  y += subLines.length * 4.5 + 2

  doc.setTextColor(...PDF_THEME.bodyText)
  return y
}

function drawPageFooters(doc: jsPDF): void {
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...PDF_THEME.subtitleText)
    doc.text(WATER_READINGS_PDF_FOOTER, marginCenter(pageW), pageH - 10, { align: 'center' })
    doc.text(`Page ${i} of ${total}`, pageW / 2, pageH - 5, { align: 'center' })
    doc.setTextColor(...PDF_THEME.bodyText)
  }
}

function marginCenter(pageW: number): number {
  return pageW / 2
}

export function downloadWaterLevelReadingsPdf(
  filename: string,
  readings: WaterLevelReading[],
  filterLabel: string,
  options: WaterReadingsPdfOptions
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 14
  let y = drawBrandedHeader(doc, options.meta, options.logo ?? null, margin, pageW)
  y = drawReportHeading(doc, options.meta, y, margin, pageW)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generated: ${formatDate(new Date())} ${formatTime(new Date())}`, margin, y)
  y += 4.5
  doc.text(`Filters: ${filterLabel}`, margin, y)
  y += 4.5
  doc.text(`Total readings: ${readings.length}`, margin, y)
  y += 5

  doc.setDrawColor(...PDF_THEME.ruleGray)
  doc.setLineWidth(0.35)
  doc.line(margin, y, pageW - margin, y)
  y += 5

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...PDF_THEME.titleText)
  doc.text('Reading history', margin, y)
  y += 4

  autoTable(doc, {
    startY: y,
    head: [[...WATER_LEVEL_READING_HEADERS]],
    body: waterLevelReadingTableRows(readings),
    margin: { left: margin, right: margin, bottom: 16 },
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 2,
      textColor: PDF_THEME.bodyText,
      lineColor: PDF_THEME.ruleGray,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: PDF_THEME.headerGreen,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: { fillColor: PDF_THEME.zebraStripe },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 24 },
      2: { cellWidth: 24 },
      3: { cellWidth: 24 },
      4: { cellWidth: 16, halign: 'right' },
      5: { cellWidth: 14 },
      6: { cellWidth: 22 },
      7: { cellWidth: 38 },
      8: { cellWidth: 20 },
    },
  })

  drawPageFooters(doc)
  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
}
