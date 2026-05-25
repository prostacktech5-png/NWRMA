import { getDamSafetyApplicantEmails } from '@/lib/dam-safety-application'
import {
  sendDamSafetyApplicationReceivedEmail,
  sendDamSafetyStatusEmail,
} from '@/lib/mail'
import type { DamSafetyApplication, DamSafetyApplicationStatus } from '@/lib/types'

function emailBase(app: DamSafetyApplication) {
  const { to, cc } = getDamSafetyApplicantEmails(app)
  return {
    to,
    cc,
    contactName: app.applicantName,
    organisationName: app.organisationName,
    reference: app.reference,
    reviewNote: app.reviewNote,
  }
}

export async function notifyDamSafetyApplicationReceived(
  app: DamSafetyApplication
): Promise<void> {
  await sendDamSafetyApplicationReceivedEmail(emailBase(app))
}

export async function notifyDamSafetyApplicantForStatus(
  app: DamSafetyApplication,
  status: DamSafetyApplicationStatus,
  options?: { amendUrl?: string }
): Promise<void> {
  const base = { ...emailBase(app), amendUrl: options?.amendUrl ?? null }
  switch (status) {
    case 'additional_info_required':
      await sendDamSafetyStatusEmail(base, 'additional_info_required')
      break
    case 'approved':
      await sendDamSafetyStatusEmail(base, 'approved')
      break
    case 'rejected':
      await sendDamSafetyStatusEmail(base, 'rejected')
      break
    default:
      break
  }
}
