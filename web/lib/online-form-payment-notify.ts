import { onlineFormResumeUrl } from '@/lib/form-resume-token'
import {
  sendPaymentRejectedEmail,
  sendPaymentVerifiedResumeEmail,
} from '@/lib/mail'
import {
  buildPaymentVerificationReceiptPdf,
  paymentVerificationReceiptFilename,
} from '@/lib/payment-verification-receipt-pdf'
import { loadPublicLogoForPdf } from '@/lib/public-logo-pdf'
import type { OnlineFormPaymentIntake } from '@/lib/types'

export async function notifyPaymentIntakeApproved(
  intake: OnlineFormPaymentIntake,
  rawResumeToken: string
): Promise<void> {
  const logo = await loadPublicLogoForPdf()
  const receiptPdf = buildPaymentVerificationReceiptPdf(intake, logo)

  await sendPaymentVerifiedResumeEmail({
    to: intake.email,
    contactName: intake.contactPersonName,
    organisationName: intake.organisationName,
    formTitle: intake.formTitle,
    intakeReference: intake.intakeReference,
    financeReceiptNumber: intake.bankReceiptValidation?.receiptNumber ?? null,
    resumeUrl: onlineFormResumeUrl(intake.formSlug, rawResumeToken),
    attachments: [
      {
        filename: paymentVerificationReceiptFilename(
          intake.intakeReference,
          intake.bankReceiptValidation?.receiptNumber
        ),
        content: receiptPdf,
        contentType: 'application/pdf',
      },
    ],
  })
}

export async function notifyPaymentIntakeRejected(
  intake: OnlineFormPaymentIntake,
  note: string
): Promise<void> {
  await sendPaymentRejectedEmail({
    to: intake.email,
    contactName: intake.contactPersonName,
    organisationName: intake.organisationName,
    formTitle: intake.formTitle,
    intakeReference: intake.intakeReference,
    reviewNote: note,
  })
}
