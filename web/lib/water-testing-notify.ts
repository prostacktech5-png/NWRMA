import {
  touchWaterTestingEmailSent,
} from '@/lib/db/water-testing-persistence'
import { isSmtpConfigured } from '@/lib/mail'
import {
  sendWaterTestingCollectionScheduledEmail,
  sendWaterTestingCompletedEmail,
  sendWaterTestingReceivedEmail,
  sendWaterTestingStaffAlertEmail,
} from '@/lib/mail'
import type { LabRequest } from '@/lib/types'

function emailBase(req: LabRequest) {
  return {
    to: req.requesterEmail,
    contactName: req.requesterName,
    reference: req.reference,
    organisation: req.organisation,
    siteAddress: req.siteAddress,
    testsRequested: req.testsRequested,
  }
}

async function afterSend(id: string): Promise<void> {
  await touchWaterTestingEmailSent(id)
}

export async function notifyWaterTestingReceived(req: LabRequest): Promise<void> {
  if (!isSmtpConfigured()) {
    console.warn('[water-testing] SMTP not configured — skipping received email')
    return
  }
  await sendWaterTestingReceivedEmail(emailBase(req))
  await sendWaterTestingStaffAlertEmail({
    reference: req.reference,
    requesterName: req.requesterName,
    requesterEmail: req.requesterEmail,
    organisation: req.organisation,
  })
  await afterSend(req.id)
}

export async function notifyWaterTestingCollectionScheduled(
  req: LabRequest,
): Promise<void> {
  if (!isSmtpConfigured()) {
    console.warn('[water-testing] SMTP not configured — skipping collection email')
    return
  }
  if (!req.sampleCollectionScheduledAt) {
    throw new Error('sampleCollectionScheduledAt is required')
  }
  await sendWaterTestingCollectionScheduledEmail({
    ...emailBase(req),
    scheduledAt: req.sampleCollectionScheduledAt,
  })
  await afterSend(req.id)
}

export async function notifyWaterTestingCompleted(req: LabRequest): Promise<void> {
  if (!isSmtpConfigured()) {
    console.warn('[water-testing] SMTP not configured — skipping completed email')
    return
  }
  await sendWaterTestingCompletedEmail({
    ...emailBase(req),
    results: req.results ?? {},
    reportNotes: req.reportNotes,
  })
  await afterSend(req.id)
}
