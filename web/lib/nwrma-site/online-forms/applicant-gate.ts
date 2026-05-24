import type { DamSafetyFormPayload } from '@/lib/nwrma-site/online-forms/dam-safety-schema'
import type { EffluentDischargeFormPayload } from '@/lib/nwrma-site/online-forms/effluent-discharge-schema'
import type { WaterDrillingLicenceFormPayload } from '@/lib/nwrma-site/online-forms/water-drilling-licence-schema'
import type { WaterRightFormPayload } from '@/lib/nwrma-site/online-forms/water-right-schema'

export type OnlineFormSlug =
  | 'water-drilling-licence'
  | 'dam-safety'
  | 'effluent-discharge'
  | 'water-right'

export type ApplicantGateFields = {
  organizationName: string
  email: string
  phone: string
  contactPersonName: string
}

export function applicantGateInitialValues(form: {
  companyName?: string
  email?: string
  phone?: string
  mobilePhone?: string
  contactName?: string
  contactPersonName?: string
}): ApplicantGateFields {
  return {
    organizationName: form.companyName?.trim() ?? '',
    email: form.email?.trim() ?? '',
    phone: (form.phone ?? form.mobilePhone ?? '').trim(),
    contactPersonName: (form.contactName ?? form.contactPersonName ?? '').trim(),
  }
}

export function applyApplicantGate<T extends OnlineFormSlug>(
  formSlug: T,
  form: T extends 'water-drilling-licence'
    ? WaterDrillingLicenceFormPayload
    : T extends 'dam-safety'
      ? DamSafetyFormPayload
      : T extends 'effluent-discharge'
        ? EffluentDischargeFormPayload
        : WaterRightFormPayload,
  fields: ApplicantGateFields
): typeof form {
  const org = fields.organizationName.trim()
  const email = fields.email.trim()
  const phone = fields.phone.trim()
  const person = fields.contactPersonName.trim()

  if (formSlug === 'water-drilling-licence') {
    const f = form as WaterDrillingLicenceFormPayload
    const contactEmail = f.contactEmail?.trim() || email
    const contactPhone = f.contactPhone?.trim() || phone
    return {
      ...f,
      companyName: org,
      email,
      phone,
      contactName: person,
      contactEmail,
      contactPhone,
    } as typeof form
  }

  const permit = form as DamSafetyFormPayload | EffluentDischargeFormPayload | WaterRightFormPayload
  const officePhone = permit.officePhone?.trim() || phone
  const mobilePhone = permit.mobilePhone?.trim() || phone
  return {
    ...permit,
    companyName: org,
    email,
    officePhone,
    mobilePhone,
    contactPersonName: person,
  } as typeof form
}

export const BANK_RECEIPT_SLOT_ID = 'bankReceipt' as const

export const BANK_RECEIPT_ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'

export const MAX_BANK_RECEIPT_BYTES = 10 * 1024 * 1024

export function validateApplicantGateFields(
  fields: ApplicantGateFields,
  bankReceipt: File | null
): string | null {
  if (!fields.organizationName.trim()) return 'Name of Organization is required.'
  if (!fields.email.trim()) return 'Email is required.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) return 'Enter a valid email address.'
  if (!fields.phone.trim()) return 'Phone number is required.'
  if (!fields.contactPersonName.trim()) return 'Name of the person is required.'
  if (!bankReceipt || bankReceipt.size === 0) return 'Upload your bank receipt is required.'
  if (bankReceipt.size > MAX_BANK_RECEIPT_BYTES) return 'Bank receipt must be 10 MB or smaller.'
  const mime = bankReceipt.type || ''
  const allowed =
    mime === 'application/pdf' ||
    mime === 'image/jpeg' ||
    mime === 'image/png' ||
    /\.(pdf|jpe?g|png)$/i.test(bankReceipt.name)
  if (!allowed) return 'Bank receipt must be PDF, JPG, or PNG.'
  return null
}

/** Append bank receipt from gate to multipart submit body */
export function appendBankReceiptFiles(
  body: FormData,
  files: File[] | undefined,
  slotId: string = BANK_RECEIPT_SLOT_ID
): void {
  for (const file of files ?? []) {
    if (file.size > 0) body.append(`doc_${slotId}`, file)
  }
}

/** Append optional uploads (e.g. bank receipt) not in the required checklist */
export function appendOptionalDocumentFiles(
  body: FormData,
  documents: Record<string, File[] | undefined>,
  requiredSlotIds: readonly string[]
): void {
  const required = new Set(requiredSlotIds)
  for (const [slotId, files] of Object.entries(documents)) {
    if (required.has(slotId)) continue
    for (const file of files ?? []) {
      if (file.size > 0) body.append(`doc_${slotId}`, file)
    }
  }
}

export function requireBankReceiptUploaded(
  documents: Record<string, File[] | undefined>
): string | null {
  if (!documents[BANK_RECEIPT_SLOT_ID]?.length) {
    return 'Bank receipt is required. Complete the applicant details from the Instructions step.'
  }
  return null
}

/** Server-side check for multipart submit */
export function getBankReceiptFromFormData(formData: FormData): File[] {
  return formData
    .getAll(`doc_${BANK_RECEIPT_SLOT_ID}`)
    .filter((f): f is File => f instanceof File && f.size > 0)
}

export function requireBankReceiptInFormData(formData: FormData): string | null {
  if (getBankReceiptFromFormData(formData).length === 0) {
    return 'Bank receipt upload is required.'
  }
  return null
}
