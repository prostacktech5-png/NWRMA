import type { DamSafetyDocumentSlotId } from '@/lib/dam-safety-documents'
import { canReviewOnlineFormApplicationsInApu } from '@/lib/online-form-application-review-access'
import { emptyDamSafetyDocumentMeta } from '@/lib/dam-safety-documents'
import type { DamSafetyFormPayload } from '@/lib/nwrma-site/online-forms/dam-safety-schema'
import type {
  DamSafetyApplication,
  DamSafetyApplicationStatus,
  DamSafetyDocumentSlots,
  User,
} from '@/lib/types'

export type DamSafetyApplicationDocuments = DamSafetyDocumentSlots

const REVIEWABLE: DamSafetyApplicationStatus[] = [
  'under_review',
  'approved',
  'rejected',
  'additional_info_required',
]

export function newDamSafetyApplicationId(): string {
  return `dsa-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function nextDamSafetyReference(existing: DamSafetyApplication[]): string {
  const year = new Date().getFullYear()
  const prefix = `DSA-${year}-`
  let max = 0
  for (const app of existing) {
    if (!app.reference.startsWith(prefix)) continue
    const n = parseInt(app.reference.slice(prefix.length), 10)
    if (Number.isFinite(n) && n > max) max = n
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`
}

export function isReviewableDamSafetyStatus(
  status: string
): status is (typeof REVIEWABLE)[number] {
  return REVIEWABLE.includes(status as DamSafetyApplicationStatus)
}

export function legacyCanReviewDamSafetyApplications(
  user: Pick<User, 'role' | 'department'>
): boolean {
  if (user.role === 'dg') return true
  if (user.role === 'hod' && user.department === 'compliance') return true
  if (user.role === 'staff' && user.department === 'compliance') return true
  if (user.role === 'admin') return true
  return false
}

export function canReviewDamSafetyApplications(
  viewer: Pick<User, 'role' | 'department'> & {
    platformRoles?: string[]
    departmentSectionAccess?: User['departmentSectionAccess']
    hydroNavAccess?: User['hydroNavAccess']
  }
): boolean {
  if (canReviewOnlineFormApplicationsInApu(viewer)) return true
  return legacyCanReviewDamSafetyApplications(viewer)
}

export function createDamSafetyApplicationFromForm(params: {
  form: DamSafetyFormPayload
  documents: DamSafetyApplicationDocuments
  existing: DamSafetyApplication[]
  applicationId?: string
}): DamSafetyApplication {
  const { form, documents, existing } = params
  const id = params.applicationId ?? newDamSafetyApplicationId()

  return {
    id,
    reference: nextDamSafetyReference(existing),
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
    documents: { ...emptyDamSafetyDocumentMeta(), ...documents },
    formType: 'dam-safety-v1',
    extendedForm: form,
  }
}

export function getDamSafetyApplicantEmails(app: DamSafetyApplication): {
  to: string
  cc?: string
} {
  const to = app.applicantEmail?.trim() || app.email?.trim() || ''
  if (!to) return { to: 'noreply@nwrma.gov.sl' }
  return { to }
}

export function formatDamSafetyApplicantEmailList(app: DamSafetyApplication): string {
  const { to, cc } = getDamSafetyApplicantEmails(app)
  return cc ? `${to} (cc: ${cc})` : to
}
