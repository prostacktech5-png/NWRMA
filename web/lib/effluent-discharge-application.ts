import type { EffluentDischargeDocumentSlotId } from '@/lib/effluent-discharge-documents'
import { canReviewOnlineFormApplicationsInApu } from '@/lib/online-form-application-review-access'
import { emptyEffluentDischargeDocumentMeta } from '@/lib/effluent-discharge-documents'
import type { EffluentDischargeFormPayload } from '@/lib/nwrma-site/online-forms/effluent-discharge-schema'
import type {
  EffluentDischargeApplication,
  EffluentDischargeApplicationStatus,
  EffluentDischargeDocumentSlots,
  User,
} from '@/lib/types'

export type EffluentDischargeApplicationDocuments = EffluentDischargeDocumentSlots

const REVIEWABLE: EffluentDischargeApplicationStatus[] = [
  'under_review',
  'approved',
  'rejected',
  'additional_info_required',
]

export function newEffluentDischargeApplicationId(): string {
  return `eda-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function nextEffluentDischargeReference(
  existing: EffluentDischargeApplication[]
): string {
  const year = new Date().getFullYear()
  const prefix = `EDA-${year}-`
  let max = 0
  for (const app of existing) {
    if (!app.reference.startsWith(prefix)) continue
    const n = parseInt(app.reference.slice(prefix.length), 10)
    if (Number.isFinite(n) && n > max) max = n
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`
}

export function isReviewableEffluentDischargeStatus(
  status: string
): status is (typeof REVIEWABLE)[number] {
  return REVIEWABLE.includes(status as EffluentDischargeApplicationStatus)
}

export function legacyCanReviewEffluentDischargeApplications(
  user: Pick<User, 'role' | 'department'>
): boolean {
  if (user.role === 'dg') return true
  if (user.role === 'hod' && user.department === 'compliance') return true
  if (user.role === 'staff' && user.department === 'compliance') return true
  if (user.role === 'admin') return true
  return false
}

export function canReviewEffluentDischargeApplications(
  viewer: Pick<User, 'role' | 'department'> & {
    platformRoles?: string[]
    departmentSectionAccess?: User['departmentSectionAccess']
    hydroNavAccess?: User['hydroNavAccess']
  }
): boolean {
  if (canReviewOnlineFormApplicationsInApu(viewer)) return true
  return legacyCanReviewEffluentDischargeApplications(viewer)
}

export function createEffluentDischargeApplicationFromForm(params: {
  form: EffluentDischargeFormPayload
  documents: EffluentDischargeApplicationDocuments
  existing: EffluentDischargeApplication[]
  applicationId?: string
}): EffluentDischargeApplication {
  const { form, documents, existing } = params
  const id = params.applicationId ?? newEffluentDischargeApplicationId()

  return {
    id,
    reference: nextEffluentDischargeReference(existing),
    status: 'submitted',
    applicantName: form.contactPersonName,
    applicantEmail: form.email,
    organisationName: form.companyName,
    submittedAt: new Date(),
    companyName: form.companyName,
    contactPhone: form.mobilePhone || form.officePhone,
    email: form.email,
    mailingAddress: form.mailingAddress,
    district: form.district,
    documents: { ...emptyEffluentDischargeDocumentMeta(), ...documents },
    formType: 'effluent-discharge-v1',
    extendedForm: form,
  }
}

export function getEffluentDischargeApplicantEmails(app: EffluentDischargeApplication): {
  to: string
  cc?: string
} {
  const to = app.applicantEmail?.trim() || app.email?.trim() || ''
  if (!to) return { to: 'noreply@nwrma.gov.sl' }
  return { to }
}

export function formatEffluentDischargeApplicantEmailList(
  app: EffluentDischargeApplication
): string {
  const { to, cc } = getEffluentDischargeApplicantEmails(app)
  return cc ? `${to} (cc: ${cc})` : to
}
