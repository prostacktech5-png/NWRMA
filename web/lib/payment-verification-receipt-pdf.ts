import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDateValue } from '@/lib/erp-formatting'
import type { ReportPdfLogo } from '@/lib/hydro-activity-report-pdf-logo'
import type { OnlineFormPaymentIntake } from '@/lib/types'

/** Sierra Leone flag — green, white, blue */
export const SL_FLAG = {
  green: [30, 181, 58] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  blue: [0, 114, 198] as [number, number, number],
}

const BODY = [33, 37, 41] as [number, number, number]
const MUTED = [102, 102, 102] as [number, number, number]

function drawSierraLeoneFlagBand(doc: jsPDF, pageW: number): number {
  const stripeH = 9
  doc.setFillColor(...SL_FLAG.green)
  doc.rect(0, 0, pageW, stripeH, 'F')
  doc.setFillColor(...SL_FLAG.white)
  doc.rect(0, stripeH, pageW, stripeH, 'F')
  doc.setFillColor(...SL_FLAG.blue)
  doc.rect(0, stripeH * 2, pageW, stripeH, 'F')
  return stripeH * 3
}

function drawVerifiedStamp(doc: jsPDF, x: number, y: number): void {
  const r = 18
  doc.setDrawColor(...SL_FLAG.green)
  doc.setLineWidth(1.2)
  doc.circle(x + r, y + r, r, 'S')
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...SL_FLAG.green)
  doc.text('VERIFIED', x + r, y + r - 2, { align: 'center' })
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('NWRMA FINANCE', x + r, y + r + 5, { align: 'center' })
}

export function paymentVerificationReceiptFilename(
  intakeReference: string,
  receiptNumber?: string | null
): string {
  const base = (receiptNumber?.trim() || intakeReference).replace(/[^\w-]+/g, '-')
  return `NWRMA-Payment-Receipt-${base}.pdf`
}

/**
 * Official payment verification receipt (Sierra Leone flag colours) for email attachment.
 */
export function buildPaymentVerificationReceiptPdf(
  intake: OnlineFormPaymentIntake,
  logo?: ReportPdfLogo | null
): Buffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 16
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const contentW = pageW - margin * 2

  const flagBottom = drawSierraLeoneFlagBand(doc, pageW)
  let y = flagBottom + 10

  const logoMm = 24
  if (logo) {
    try {
      doc.setFillColor(...SL_FLAG.white)
      doc.roundedRect(margin, y - 2, logoMm + 2, logoMm + 2, 2, 2, 'F')
      doc.addImage(logo.base64, logo.format, margin + 1, y - 1, logoMm, logoMm)
    } catch {
      /* skip */
    }
  }

  const textX = logo ? margin + logoMm + 6 : margin
  doc.setTextColor(...SL_FLAG.blue)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('National Water Resources Management Agency', textX, y + 4)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MUTED)
  doc.text('Republic of Sierra Leone — Finance Department', textX, y + 10)
  y += logo ? logoMm + 6 : 16

  doc.setFillColor(...SL_FLAG.blue)
  doc.rect(margin, y, contentW, 14, 'F')
  doc.setTextColor(...SL_FLAG.white)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('PAYMENT VERIFICATION RECEIPT', pageW / 2, y + 9, { align: 'center' })
  y += 20

  const validatedAt = intake.bankReceiptValidation?.validatedAt
  const validatedAtLabel = validatedAt
    ? formatDateValue(validatedAt instanceof Date ? validatedAt : new Date(validatedAt))
    : formatDateValue(new Date())
  const submittedAt =
    intake.createdAt instanceof Date
      ? formatDateValue(intake.createdAt)
      : formatDateValue(new Date(intake.createdAt))

  const officialReceipt = intake.bankReceiptValidation?.receiptNumber?.trim()

  const rows: [string, string][] = [
    ...(officialReceipt ? [['Official receipt number', officialReceipt] as [string, string]] : []),
    ['Payment intake reference', intake.intakeReference],
    ['Date verified', validatedAtLabel],
    ['Application type', intake.formTitle],
    ['Organisation', intake.organisationName],
    ['Contact person', intake.contactPersonName],
    ['Email', intake.email],
    ['Phone', intake.phone],
    ['Payment submitted', submittedAt],
    ['Bank receipt file', intake.receiptFile.name],
  ]

  if (intake.bankReceiptValidation?.validatedByName) {
    rows.push(['Verified by', intake.bankReceiptValidation.validatedByName])
  }
  if (intake.bankReceiptValidation?.note?.trim()) {
    rows.push(['Finance note', intake.bankReceiptValidation.note.trim()])
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    tableWidth: contentW,
    theme: 'plain',
    body: rows,
    styles: {
      fontSize: 10,
      cellPadding: { top: 3.5, right: 4, bottom: 3.5, left: 4 },
      textColor: BODY,
      lineColor: [220, 228, 235],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: {
        fontStyle: 'bold',
        cellWidth: 52,
        fillColor: SL_FLAG.white,
        textColor: SL_FLAG.blue,
      },
      1: { cellWidth: contentW - 52 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index % 2 === 1) {
        data.cell.styles.fillColor = [248, 252, 250]
      }
    },
  })

  const afterTable =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 60
  y = afterTable + 8

  doc.setDrawColor(...SL_FLAG.green)
  doc.setLineWidth(0.8)
  doc.line(margin, y, margin + 4, y)
  doc.setFontSize(9)
  doc.setTextColor(...BODY)
  doc.setFont('helvetica', 'normal')
  const note =
    'This receipt confirms that your administrative fee payment has been verified. Use the secure link in your email to complete and submit your online application. The link is personal and may only be used once.'
  const noteLines = doc.splitTextToSize(note, contentW - 44) as string[]
  doc.text(noteLines, margin + 6, y + 4)
  drawVerifiedStamp(doc, pageW - margin - 40, y - 2)

  y += Math.max(28, noteLines.length * 4.5 + 8)

  doc.setFillColor(...SL_FLAG.green)
  doc.rect(margin, y, contentW, 1.2, 'F')
  y += 6

  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text('National Water Resources Management Agency', margin, y)
  doc.text('29 King Herman Road, Freetown, Sierra Leone', margin, y + 4)
  doc.text('info@nwrma.gov.sl  |  https://nwrma.gov.sl', margin, y + 8)

  doc.setFontSize(7)
  doc.text(
    'Computer-generated receipt — no signature required.',
    pageW / 2,
    pageH - 10,
    { align: 'center' }
  )

  const arr = doc.output('arraybuffer')
  return Buffer.from(arr)
}
