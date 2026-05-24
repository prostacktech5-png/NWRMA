import {
  saveLicenseFileFromBuffer,
  newLicenseFileId,
  isAllowedLicenseMime,
} from '@/lib/borehole-license-file-store'
import { saveDamSafetyFileFromBuffer } from '@/lib/dam-safety-file-store'
import { saveEffluentDischargeFileFromBuffer } from '@/lib/effluent-discharge-file-store'
import { saveWaterRightFileFromBuffer } from '@/lib/water-right-file-store'
import type { ErpReferencePayload } from '@/lib/erp-reference-types'
import { BANK_RECEIPT_SLOT_ID } from '@/lib/nwrma-site/online-forms/applicant-gate'
import {
  assertIntakeReadyForApplicationSubmit,
  copyIntakeReceiptBuffer,
  findPaymentIntake,
  patchIntakeInPayload,
} from '@/lib/online-form-payment-intake'
import type { OnlineFormPaymentIntake } from '@/lib/types'

export function parsePaymentIntakeSubmitFields(
  formData: FormData
): { intakeId: string; resumeToken: string } | { error: string } {
  const intakeId = String(formData.get('intakeId') ?? '').trim()
  const resumeToken = String(formData.get('resumeToken') ?? '').trim()
  if (!intakeId || !resumeToken) {
    return { error: 'Validated payment intake is required. Use the link from your approval email.' }
  }
  return { intakeId, resumeToken }
}

export function validatePaymentIntakeForSubmit(
  payload: ErpReferencePayload,
  formSlug: string,
  intakeId: string,
  resumeToken: string
): { intake: OnlineFormPaymentIntake } | { error: string } {
  const intake = findPaymentIntake(payload, intakeId)
  if (!intake) return { error: 'Payment intake not found.' }
  const err = assertIntakeReadyForApplicationSubmit(intake, formSlug, resumeToken)
  if (err) return { error: err }
  return { intake }
}

export async function saveIntakeBankReceiptOnApplication(
  formSlug: string,
  applicationId: string,
  intake: OnlineFormPaymentIntake
): Promise<{ id: string; name: string; size: number; mimeType?: string; storageKey?: string } | null> {
  const copied = await copyIntakeReceiptBuffer(intake)
  if (!copied) return null

  const fileId = newLicenseFileId()
  const slotId = BANK_RECEIPT_SLOT_ID

  if (formSlug === 'water-drilling-licence') {
    return saveLicenseFileFromBuffer({
      applicationId,
      slotId,
      fileId,
      originalName: copied.name,
      mimeType: copied.mimeType,
      buffer: copied.buffer,
    })
  }
  if (formSlug === 'dam-safety') {
    return saveDamSafetyFileFromBuffer({
      applicationId,
      slotId,
      fileId,
      originalName: copied.name,
      mimeType: copied.mimeType,
      buffer: copied.buffer,
    })
  }
  if (formSlug === 'effluent-discharge') {
    return saveEffluentDischargeFileFromBuffer({
      applicationId,
      slotId,
      fileId,
      originalName: copied.name,
      mimeType: copied.mimeType,
      buffer: copied.buffer,
    })
  }
  if (formSlug === 'water-right') {
    return saveWaterRightFileFromBuffer({
      applicationId,
      slotId,
      fileId,
      originalName: copied.name,
      mimeType: copied.mimeType,
      buffer: copied.buffer,
    })
  }
  return null
}

export function linkIntakeToApplication(
  payload: ErpReferencePayload,
  intakeId: string,
  applicationId: string
): ErpReferencePayload {
  return patchIntakeInPayload(payload, intakeId, {
    linkedApplicationId: applicationId,
    resumeTokenHash: null,
    resumeTokenExpiresAt: null,
  })
}

export function isBankReceiptSlot(slotId: string): boolean {
  return slotId === BANK_RECEIPT_SLOT_ID
}

export function isAllowedOptionalUploadMime(mime: string): boolean {
  return isAllowedLicenseMime(mime)
}
