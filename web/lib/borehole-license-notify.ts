import { getApplicantNotifyEmails } from '@/lib/borehole-license-application'
import {
  sendLicenseAdditionalInfoEmail,
  sendLicenseApplicationReceivedEmail,
  sendLicenseApprovedEmail,
  sendLicenseRejectedEmail,
  sendLicenseSiteInspectionEmail,
} from '@/lib/mail'
import type { BoreholeLicenseApplication, LicenseApplicationStatus } from '@/lib/types'

function emailBase(app: BoreholeLicenseApplication) {
  const { to, cc } = getApplicantNotifyEmails(app)
  return {
    to,
    cc,
    contactName: app.contactName,
    organisationName: app.organisationName,
    reference: app.reference,
    reviewNote: app.reviewNote,
  }
}

export async function notifyApplicantApplicationReceived(
  app: BoreholeLicenseApplication
): Promise<void> {
  await sendLicenseApplicationReceivedEmail(emailBase(app))
}

export async function notifyApplicantForLicenseStatus(
  app: BoreholeLicenseApplication,
  status: LicenseApplicationStatus,
  options?: { amendUrl?: string }
): Promise<void> {
  const base = { ...emailBase(app), amendUrl: options?.amendUrl ?? null }
  switch (status) {
    case 'additional_info_required':
      await sendLicenseAdditionalInfoEmail(base)
      break
    case 'approved':
      await sendLicenseApprovedEmail(base)
      break
    case 'rejected':
      await sendLicenseRejectedEmail(base)
      break
    default:
      break
  }
}

export async function notifyApplicantSiteInspection(
  app: BoreholeLicenseApplication,
  inspectionDate: string,
  inspectionNotes?: string | null
): Promise<void> {
  await sendLicenseSiteInspectionEmail({
    ...emailBase(app),
    inspectionDate,
    inspectionNotes,
  })
}
