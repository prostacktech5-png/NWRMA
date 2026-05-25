import {
  createLicenseApplicationFromWaterDrillingForm,
  type LicenseApplicationDocuments,
} from '@/lib/borehole-license-application'
import { createDamSafetyApplicationFromForm } from '@/lib/dam-safety-application'
import { createEffluentDischargeApplicationFromForm } from '@/lib/effluent-discharge-application'
import { createWaterRightApplicationFromForm } from '@/lib/water-right-application'
import type { WaterDrillingLicenceFormPayload } from '@/lib/nwrma-site/online-forms/water-drilling-licence-schema'
import type { DamSafetyFormPayload } from '@/lib/nwrma-site/online-forms/dam-safety-schema'
import type { EffluentDischargeFormPayload } from '@/lib/nwrma-site/online-forms/effluent-discharge-schema'
import type { WaterRightFormPayload } from '@/lib/nwrma-site/online-forms/water-right-schema'
import type {
  BoreholeLicenseApplication,
  DamSafetyApplication,
  EffluentDischargeApplication,
  WaterRightApplication,
} from '@/lib/types'

function clearAmendmentMeta<T extends Record<string, unknown>>(app: T): T {
  return {
    ...app,
    amendmentTokenHash: null,
    amendmentTokenExpiresAt: null,
    amendmentClearPaths: null,
  }
}

export function resubmitWaterDrillingApplication(
  existing: BoreholeLicenseApplication,
  form: WaterDrillingLicenceFormPayload,
  documents: LicenseApplicationDocuments
): BoreholeLicenseApplication {
  const rebuilt = createLicenseApplicationFromWaterDrillingForm({
    form,
    documents,
    existing: [],
    applicationId: existing.id,
  })
  return clearAmendmentMeta({
    ...rebuilt,
    reference: existing.reference,
    submittedAt: new Date(),
    status: 'submitted',
    reviewNote: existing.reviewNote ?? null,
    reviewedAt: existing.reviewedAt ?? null,
    siteInspectionDate: existing.siteInspectionDate ?? null,
    siteInspectionNotes: existing.siteInspectionNotes ?? null,
    technicalReportSummary: existing.technicalReportSummary ?? null,
    lastEmailSentAt: existing.lastEmailSentAt ?? null,
    licensedCompanyId: existing.licensedCompanyId ?? null,
    bankReceiptValidation: existing.bankReceiptValidation,
    paymentStatus: existing.paymentStatus,
  })
}

export function resubmitDamSafetyApplication(
  existing: DamSafetyApplication,
  form: DamSafetyFormPayload,
  documents: DamSafetyApplication['documents']
): DamSafetyApplication {
  const rebuilt = createDamSafetyApplicationFromForm({
    form,
    documents,
    existing: [],
    applicationId: existing.id,
  })
  return clearAmendmentMeta({
    ...rebuilt,
    reference: existing.reference,
    submittedAt: new Date(),
    status: 'submitted',
    reviewNote: existing.reviewNote ?? null,
    reviewedAt: existing.reviewedAt ?? null,
    lastEmailSentAt: existing.lastEmailSentAt ?? null,
    bankReceiptValidation: existing.bankReceiptValidation,
  })
}

export function resubmitEffluentApplication(
  existing: EffluentDischargeApplication,
  form: EffluentDischargeFormPayload,
  documents: EffluentDischargeApplication['documents']
): EffluentDischargeApplication {
  const rebuilt = createEffluentDischargeApplicationFromForm({
    form,
    documents,
    existing: [],
    applicationId: existing.id,
  })
  return clearAmendmentMeta({
    ...rebuilt,
    reference: existing.reference,
    submittedAt: new Date(),
    status: 'submitted',
    reviewNote: existing.reviewNote ?? null,
    reviewedAt: existing.reviewedAt ?? null,
    lastEmailSentAt: existing.lastEmailSentAt ?? null,
    bankReceiptValidation: existing.bankReceiptValidation,
  })
}

export function resubmitWaterRightApplication(
  existing: WaterRightApplication,
  form: WaterRightFormPayload,
  documents: WaterRightApplication['documents']
): WaterRightApplication {
  const rebuilt = createWaterRightApplicationFromForm({
    form,
    documents,
    existing: [],
    applicationId: existing.id,
  })
  return clearAmendmentMeta({
    ...rebuilt,
    reference: existing.reference,
    submittedAt: new Date(),
    status: 'submitted',
    reviewNote: existing.reviewNote ?? null,
    reviewedAt: existing.reviewedAt ?? null,
    lastEmailSentAt: existing.lastEmailSentAt ?? null,
    bankReceiptValidation: existing.bankReceiptValidation,
  })
}

export function summarizeExistingDocuments(
  documents: Record<string, { id: string; name: string }[] | undefined> | undefined
): Record<string, { id: string; name: string }[]> {
  const out: Record<string, { id: string; name: string }[]> = {}
  if (!documents) return out
  for (const [slotId, files] of Object.entries(documents)) {
    if (files?.length) {
      out[slotId] = files.map((f) => ({ id: f.id, name: f.name }))
    }
  }
  return out
}
