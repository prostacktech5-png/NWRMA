import { getEffluentDischargeApplicantEmails } from '@/lib/effluent-discharge-application'
import {
  sendEffluentDischargeApplicationReceivedEmail,
  sendEffluentDischargeStatusEmail,
} from '@/lib/mail'
import type {
  EffluentDischargeApplication,
  EffluentDischargeApplicationStatus,
} from '@/lib/types'

function emailBase(app: EffluentDischargeApplication) {
  const { to, cc } = getEffluentDischargeApplicantEmails(app)
  return {
    to,
    cc,
    contactName: app.applicantName || app.extendedForm?.contactPersonName || 'Applicant',
    organisationName: app.organisationName,
    reference: app.reference,
    reviewNote: app.reviewNote ?? undefined,
  }
}

export async function notifyEffluentDischargeApplicationReceived(
  app: EffluentDischargeApplication
): Promise<void> {
  await sendEffluentDischargeApplicationReceivedEmail(emailBase(app))
}

export async function notifyEffluentDischargeApplicantForStatus(
  app: EffluentDischargeApplication,
  status: EffluentDischargeApplicationStatus
): Promise<void> {
  const base = emailBase(app)
  switch (status) {
    case 'additional_info_required':
      await sendEffluentDischargeStatusEmail(base, 'additional_info_required')
      break
    case 'approved':
      await sendEffluentDischargeStatusEmail(base, 'approved')
      break
    case 'rejected':
      await sendEffluentDischargeStatusEmail(base, 'rejected')
      break
    default:
      break
  }
}
