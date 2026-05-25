import { getWaterRightApplicantEmails } from '@/lib/water-right-application'
import {
  sendWaterRightApplicationReceivedEmail,
  sendWaterRightStatusEmail,
} from '@/lib/mail'
import type { WaterRightApplication, WaterRightApplicationStatus } from '@/lib/types'

function emailBase(app: WaterRightApplication) {
  const { to, cc } = getWaterRightApplicantEmails(app)
  return {
    to,
    cc,
    contactName: app.applicantName || app.extendedForm?.contactPersonName || 'Applicant',
    organisationName: app.organisationName,
    reference: app.reference,
    reviewNote: app.reviewNote ?? undefined,
  }
}

export async function notifyWaterRightApplicationReceived(
  app: WaterRightApplication
): Promise<void> {
  await sendWaterRightApplicationReceivedEmail(emailBase(app))
}

export async function notifyWaterRightApplicantForStatus(
  app: WaterRightApplication,
  status: WaterRightApplicationStatus,
  options?: { amendUrl?: string }
): Promise<void> {
  const base = { ...emailBase(app), amendUrl: options?.amendUrl ?? null }
  switch (status) {
    case 'additional_info_required':
      await sendWaterRightStatusEmail(base, 'additional_info_required')
      break
    case 'approved':
      await sendWaterRightStatusEmail(base, 'approved')
      break
    case 'rejected':
      await sendWaterRightStatusEmail(base, 'rejected')
      break
    default:
      break
  }
}
