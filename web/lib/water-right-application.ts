import type { WaterRightDocumentSlotId } from '@/lib/water-right-documents'
import { canReviewOnlineFormApplicationsInApu } from '@/lib/online-form-application-review-access'
import { emptyWaterRightDocumentMeta } from '@/lib/water-right-documents'
import type { WaterRightFormPayload } from '@/lib/nwrma-site/online-forms/water-right-schema'
import type {
  User,
  WaterRightApplication,
  WaterRightApplicationStatus,
  WaterRightDocumentSlots,
} from '@/lib/types'

export type WaterRightApplicationDocuments = WaterRightDocumentSlots

const REVIEWABLE: WaterRightApplicationStatus[] = [
  'under_review',
  'approved',
  'rejected',
  'additional_info_required',
]

export function newWaterRightApplicationId(): string {
  return `wra-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function nextWaterRightReference(existing: WaterRightApplication[]): string {
  const year = new Date().getFullYear()
  const prefix = `WRA-${year}-`
  let max = 0
  for (const app of existing) {
    if (!app.reference.startsWith(prefix)) continue
    const n = parseInt(app.reference.slice(prefix.length), 10)
    if (Number.isFinite(n) && n > max) max = n
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`
}

export function isReviewableWaterRightStatus(
  status: string
): status is (typeof REVIEWABLE)[number] {
  return REVIEWABLE.includes(status as WaterRightApplicationStatus)
}

export function legacyCanReviewWaterRightApplications(
  user: Pick<User, 'role' | 'department'>
): boolean {
  if (user.role === 'dg') return true
  if (user.role === 'hod' && user.department === 'compliance') return true
  if (user.role === 'staff' && user.department === 'compliance') return true
  if (user.role === 'admin') return true
  return false
}

export function canReviewWaterRightApplications(
  viewer: Pick<User, 'role' | 'department'> & {
    platformRoles?: string[]
    departmentSectionAccess?: User['departmentSectionAccess']
    hydroNavAccess?: User['hydroNavAccess']
  }
): boolean {
  if (canReviewOnlineFormApplicationsInApu(viewer)) return true
  return legacyCanReviewWaterRightApplications(viewer)
}

export function createWaterRightApplicationFromForm(params: {
  form: WaterRightFormPayload
  documents: WaterRightApplicationDocuments
  existing: WaterRightApplication[]
  applicationId?: string
}): WaterRightApplication {
  const { form, documents, existing } = params
  const id = params.applicationId ?? newWaterRightApplicationId()

  return {
    id,
    reference: nextWaterRightReference(existing),
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
    documents: { ...emptyWaterRightDocumentMeta(), ...documents },
    formType: 'water-right-v1',
    extendedForm: form,
  }
}

export function getWaterRightApplicantEmails(app: WaterRightApplication): {
  to: string
  cc?: string
} {
  const to = app.applicantEmail?.trim() || app.email?.trim() || ''
  if (!to) return { to: 'noreply@nwrma.gov.sl' }
  return { to }
}

export function formatWaterRightApplicantEmailList(app: WaterRightApplication): string {
  const { to, cc } = getWaterRightApplicantEmails(app)
  return cc ? `${to} (cc: ${cc})` : to
}
