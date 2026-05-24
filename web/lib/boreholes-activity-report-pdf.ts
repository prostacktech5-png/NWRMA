import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { BoreholesActivityReportResponse } from '@/lib/boreholes-activity-report.types'
import type { ReportPdfLogo } from '@/lib/hydro-activity-report-pdf-logo'

const PDF_THEME = {
  primaryGreen: [40, 167, 69] as [number, number, number],
  zebraStripe: [248, 249, 250] as [number, number, number],
  titleText: [33, 37, 41] as [number, number, number],
  subtitleText: [102, 102, 102] as [number, number, number],
  bodyText: [51, 51, 51] as [number, number, number],
  ruleGray: [208, 208, 208] as [number, number, number],
}

export type BoreholesReportPdfOptions = {
  logo?: ReportPdfLogo | null
}

function drawPageFooters(doc: jsPDF): void {
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(102, 102, 102)
    doc.text(`— ${i} of ${total} —`, pageW / 2, pageH - 7, { align: 'center' })
    doc.setTextColor(...PDF_THEME.bodyText)
  }
}

function afterTable(doc: jsPDF): number {
  const t = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
  return t?.finalY ?? 40
}

function drawBrandedHeader(
  doc: jsPDF,
  layout: BoreholesActivityReportResponse['pdfLayout'],
  logo: ReportPdfLogo | null | undefined,
  margin: number,
  pageW: number
): number {
  const logoMm = 22
  const gap = 5
  const textX = margin + logoMm + gap
  let lineY = margin + 6

  if (logo) {
    try {
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(margin - 0.5, margin - 0.5, logoMm + 1, logoMm + 1, 3, 3, 'F')
      doc.setDrawColor(...PDF_THEME.ruleGray)
      doc.setLineWidth(0.25)
      doc.roundedRect(margin - 0.5, margin - 0.5, logoMm + 1, logoMm + 1, 3, 3, 'S')
      doc.addImage(logo.base64, logo.format, margin, margin, logoMm, logoMm)
    } catch {
      /* invalid image */
    }
  }

  doc.setTextColor(...PDF_THEME.titleText)
  doc.setFontSize(13.5)
  doc.setFont('helvetica', 'bold')
  const titleLines = doc.splitTextToSize(layout.title, pageW - textX - margin) as string[]
  doc.text(titleLines, textX, lineY)
  lineY += titleLines.length * 5.4

  doc.setFontSize(9.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...PDF_THEME.subtitleText)
  const subLines = doc.splitTextToSize(layout.subtitle, pageW - textX - margin) as string[]
  doc.text(subLines, textX, lineY)
  lineY += subLines.length * 4.7

  doc.setTextColor(...PDF_THEME.bodyText)
  const headerBottom = Math.max(margin + logoMm + 1, lineY) + 3
  doc.setDrawColor(...PDF_THEME.ruleGray)
  doc.setLineWidth(0.35)
  doc.line(margin, headerBottom, pageW - margin, headerBottom)
  return headerBottom + 5
}

export function downloadBoreholesActivityReportPdf(
  report: BoreholesActivityReportResponse,
  filename: string,
  options?: BoreholesReportPdfOptions
): void {
  const L = report.pdfLayout
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 14
  const pageW = doc.internal.pageSize.getWidth()
  let y = drawBrandedHeader(doc, L, options?.logo ?? null, margin, pageW)

  const ensureSpace = (needed: number) => {
    const pageH = doc.internal.pageSize.getHeight()
    if (y + needed > pageH - margin - 14) {
      doc.addPage()
      y = margin
    }
  }

  const sectionTitle = (text: string) => {
    ensureSpace(12)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...PDF_THEME.titleText)
    doc.text(text, margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...PDF_THEME.bodyText)
  }

  const paragraph = (text: string, size = 9) => {
    doc.setFontSize(size)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...PDF_THEME.bodyText)
    const lines = doc.splitTextToSize(text, pageW - 2 * margin) as string[]
    const lineH = size * 0.42
    for (const line of lines) {
      ensureSpace(lineH + 2)
      doc.text(line, margin, y)
      y += lineH + 0.4
    }
    y += 2
  }

  sectionTitle('Executive summary')
  paragraph(L.periodLine, 10)
  paragraph(L.generatedLine, 10)
  paragraph(L.intro, 9)

  const tableBase = {
    margin: { left: margin, right: margin, bottom: 16 },
    styles: {
      fontSize: 9,
      cellPadding: 2.2,
      textColor: PDF_THEME.bodyText,
      valign: 'middle' as const,
    },
    headStyles: {
      fillColor: PDF_THEME.primaryGreen,
      textColor: 255,
      fontStyle: 'bold' as const,
    },
    alternateRowStyles: { fillColor: PDF_THEME.zebraStripe },
  }

  autoTable(doc, {
    ...tableBase,
    startY: y,
    head: [['Key operational indicator', 'Status / value']],
    body: L.keyIndicators,
  })
  y = afterTable(doc) + 6

  for (const section of L.sectionTables) {
    sectionTitle(section.title)
    autoTable(doc, {
      ...tableBase,
      startY: y,
      head: [section.head],
      body: section.body,
      styles: {
        ...tableBase.styles,
        fontSize: section.body[0]?.length > 6 ? 7.5 : 8.5,
        cellPadding: 1.7,
        overflow: 'linebreak' as const,
      },
    })
    y = afterTable(doc) + 6
  }

  ensureSpace(10)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...PDF_THEME.subtitleText)
  const tagLines = doc.splitTextToSize(L.footerTagline, pageW - 2 * margin) as string[]
  for (const line of tagLines) {
    ensureSpace(4)
    doc.text(line, margin, y)
    y += 4
  }

  drawPageFooters(doc)
  doc.save(filename)
}
