import type { DocumentSlotId } from '@/lib/borehole-licensing-documents'
import {
  REQUIRED_DOCUMENT_SLOTS,
  emptyDocumentMetaSlots,
  type DocumentSlotId,
} from '@/lib/borehole-licensing-documents'
import { canReviewOnlineFormApplicationsInApu } from '@/lib/online-form-application-review-access'
import { hasPermission, viewerFromSessionFields } from '@/lib/rbac/check-permission'
import type { PlatformPermission } from '@/lib/rbac/permissions'
import type {
  BoreholeLicenseApplication,
  DrillingCompany,
  LicenseApplicationStatus,
  User,
} from '@/lib/types'
import type { WaterDrillingLicenceFormPayload } from '@/lib/nwrma-site/online-forms/water-drilling-licence-schema'

import type { LicenseApplicationDocumentMeta } from '@/lib/types'

export type LicenseApplicationDocuments = Record<
  DocumentSlotId,
  LicenseApplicationDocumentMeta[]
>

export type LicenseApplicationIntake = {
  companyName: string
  regNumber: string
  email: string
  phone: string
  address: string
  contactName: string
  contactRole: string
  contactEmail: string
  contactPhone: string
  district: string
  rigCount: string
  equipmentDescription: string
  leadHydrogeologist: string
  qualifiedDrillersCount: string
  documents: LicenseApplicationDocuments
}

const REVIEWABLE_STATUSES: LicenseApplicationStatus[] = [
  'under_review',
  'approved',
  'rejected',
  'additional_info_required',
]

export function nextLicenseReference(existing: BoreholeLicenseApplication[]): string {
  const year = new Date().getFullYear()
  const prefix = `BLA-${year}-`
  let max = 0
  for (const app of existing) {
    if (!app.reference.startsWith(prefix)) continue
    const n = parseInt(app.reference.slice(prefix.length), 10)
    if (Number.isFinite(n) && n > max) max = n
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`
}

export function isApplicationDocumentsComplete(
  documents: LicenseApplicationDocuments | undefined,
  options?: { formType?: string }
): boolean {
  if (!documents) return false
  if (options?.formType === 'water-drilling-licence-v1') {
    return REQUIRED_DOCUMENT_SLOTS.every((doc) => (documents[doc.id]?.length ?? 0) > 0)
  }
  const legacy: DocumentSlotId[] = ['businessRegistration', 'machineLifeCards', 'personnelCvs']
  return legacy.every((id) => (documents[id]?.length ?? 0) > 0)
}

export function isReviewableLicenseStatus(
  status: string
): status is (typeof REVIEWABLE_STATUSES)[number] {
  return REVIEWABLE_STATUSES.includes(status as LicenseApplicationStatus)
}

export function newLicenseApplicationId(): string {
  return `bla-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function getApplicantNotifyEmails(app: BoreholeLicenseApplication): {
  to: string
  cc?: string
} {
  const contact = app.contactEmail?.trim() || app.applicantEmail?.trim() || ''
  const company = app.email?.trim() || ''
  const to = contact || company
  if (!to) return { to: 'noreply@nwrma.gov.sl' }
  if (company && company.toLowerCase() !== to.toLowerCase()) {
    return { to, cc: company }
  }
  return { to }
}

export function formatApplicantEmailList(app: BoreholeLicenseApplication): string {
  const { to, cc } = getApplicantNotifyEmails(app)
  return cc ? `${to} (cc: ${cc})` : to
}

const INTAKE_FIELD_KEYS = [
  'companyName',
  'regNumber',
  'email',
  'phone',
  'address',
  'contactName',
  'contactRole',
  'contactEmail',
  'contactPhone',
  'district',
  'rigCount',
  'equipmentDescription',
  'leadHydrogeologist',
  'qualifiedDrillersCount',
] as const

export type IntakeFieldKey = (typeof INTAKE_FIELD_KEYS)[number]

export type LicenseApplicationIntakeFields = Omit<LicenseApplicationIntake, 'documents'>

export function parseLicenseIntakeFields(
  entries: Record<string, string>
): LicenseApplicationIntakeFields | { error: string } {
  const parsed = {} as Record<IntakeFieldKey, string>
  for (const key of INTAKE_FIELD_KEYS) {
    const v = entries[key]?.trim()
    if (!v) return { error: `Missing or invalid field: ${key}.` }
    parsed[key] = v
  }
  return parsed as LicenseApplicationIntakeFields
}

export { INTAKE_FIELD_KEYS }

const LICENSE_VALIDITY_YEARS = 1

/** Register or refresh a licensed drilling company when an application is approved. */
export function upsertDrillingCompanyFromLicense(
  companies: DrillingCompany[],
  app: BoreholeLicenseApplication
): { companies: DrillingCompany[]; company: DrillingCompany } {
  const normReg = app.regNumber.trim().toLowerCase()
  const normName = app.companyName.trim().toLowerCase()
  const index = companies.findIndex(
    (c) =>
      c.registrationNo.trim().toLowerCase() === normReg ||
      c.name.trim().toLowerCase() === normName
  )

  const licenseExpiry = new Date()
  licenseExpiry.setFullYear(licenseExpiry.getFullYear() + LICENSE_VALIDITY_YEARS)

  const existing = index >= 0 ? companies[index] : undefined
  const company: DrillingCompany = {
    id: existing?.id ?? `dc-lic-${app.id}`,
    name: app.companyName,
    registrationNo: app.regNumber,
    contacts: {
      phone: app.phone || app.contactPhone,
      email: app.email,
      address: app.address,
    },
    status: 'active',
    licenseExpiry,
  }

  const next = [...companies]
  if (index >= 0) {
    next[index] = company
  } else {
    next.push(company)
  }

  return { companies: next, company }
}

/** Ensure every approved application has a matching Drilling Companies registry row. */
export function syncApprovedApplicationsToRegistry<T extends {
  licenseApplications: BoreholeLicenseApplication[]
  drillingCompanies: DrillingCompany[]
}>(payload: T): T {
  let companies = payload.drillingCompanies
  const licenseApplications = payload.licenseApplications.map((app) => {
    if (app.status !== 'approved') return app
    const { companies: next, company } = upsertDrillingCompanyFromLicense(companies, app)
    companies = next
    if (app.licensedCompanyId === company.id) return app
    return { ...app, licensedCompanyId: company.id, organisationName: company.name }
  })
  return { ...payload, drillingCompanies: companies, licenseApplications }
}

/** Role/dept rules for legacy users — must not call `legacyHasPermission` (avoids recursion). */
export function legacyCanReviewLicenseApplications(user: Pick<User, 'role' | 'department'>): boolean {
  if (user.role === 'dg') return true
  if (user.role === 'hod' && user.department === 'boreholes') return true
  if (user.role === 'staff' && user.department === 'boreholes') return true
  return false
}

function summarizeEquipment(form: WaterDrillingLicenceFormPayload): string {
  const lines: string[] = []
  for (const [label, rows] of [
    ['Class A', form.boreholeClassA],
    ['Class B', form.boreholeClassB],
    ['Class C', form.boreholeClassC],
    ['Hand dug', form.handDugWell],
  ] as const) {
    const available = rows.filter((r) => r.qtyAvailable.trim())
    if (available.length) {
      lines.push(`${label}: ${available.map((r) => r.description).join('; ')}`)
    }
  }
  return lines.join(' | ') || 'See extended form equipment tables.'
}

function countRigs(form: WaterDrillingLicenceFormPayload): string {
  let total = 0
  for (const rows of [form.boreholeClassA, form.boreholeClassB, form.boreholeClassC]) {
    for (const row of rows) {
      if (row.description.toLowerCase().includes('drill rig')) {
        const n = parseInt(row.qtyAvailable || row.qtyExpected, 10)
        if (Number.isFinite(n)) total += n
      }
    }
  }
  return total > 0 ? String(total) : '1'
}

function leadFromPersonnel(form: WaterDrillingLicenceFormPayload): string {
  const geo = form.boreholePersonnel.find((p) => p.role.toLowerCase().includes('geologist'))
  return geo ? `${geo.role} (qty ${geo.qty})` : form.boreholePersonnel[0]?.role ?? '—'
}

function drillersCount(form: WaterDrillingLicenceFormPayload): string {
  const master = form.boreholePersonnel.find((p) =>
    p.role.toLowerCase().includes('master driller')
  )
  return master?.qty ?? form.boreholePersonnel.find((p) => p.role.toLowerCase().includes('driller'))?.qty ?? '0'
}

export function createLicenseApplicationFromWaterDrillingForm(params: {
  form: WaterDrillingLicenceFormPayload
  documents: LicenseApplicationDocuments
  existing: BoreholeLicenseApplication[]
  applicationId?: string
}): BoreholeLicenseApplication {
  const { form, documents, existing } = params
  const id = params.applicationId ?? newLicenseApplicationId()
  const reference = nextLicenseReference(existing)
  const fullAddress = [form.address, form.poBox].filter(Boolean).join(', ')

  return {
    id,
    reference,
    status: 'submitted',
    applicantName: form.contactName,
    applicantEmail: form.contactEmail,
    organisationName: form.companyName,
    submittedAt: new Date(),
    companyName: form.companyName,
    regNumber: form.regNumber,
    email: form.email,
    phone: form.phone,
    address: fullAddress,
    contactName: form.contactName,
    contactRole: 'Applicant',
    contactEmail: form.contactEmail,
    contactPhone: form.contactPhone,
    district: form.district,
    rigCount: countRigs(form),
    equipmentDescription: summarizeEquipment(form),
    leadHydrogeologist: leadFromPersonnel(form),
    qualifiedDrillersCount: drillersCount(form),
    documents: { ...emptyDocumentMetaSlots(), ...documents },
    formType: 'water-drilling-licence-v1',
    extendedForm: form,
    paymentStatus: 'unpaid',
  }
}

export function canReviewLicenseApplications(
  viewer: Pick<User, 'role' | 'department'> &
    Partial<Pick<User, 'id' | 'email' | 'name'>> & {
      platformRoles?: string[]
      permissions?: Set<PlatformPermission>
      departmentSectionAccess?: User['departmentSectionAccess']
      hydroNavAccess?: User['hydroNavAccess']
    }
): boolean {
  if (viewer.platformRoles?.includes('super_admin')) return true
  if (canReviewOnlineFormApplicationsInApu(viewer)) return true

  if (viewer.permissions && viewer.permissions.size > 0) {
    const platform = viewerFromSessionFields({
      id: viewer.id ?? '',
      email: viewer.email ?? '',
      name: viewer.name ?? '',
      role: viewer.role,
      department: viewer.department,
      platformRoles: viewer.platformRoles,
      permissions: viewer.permissions,
    })
    if (
      hasPermission(platform, 'licenses', 'approve') ||
      hasPermission(platform, 'licenses', 'update')
    ) {
      return true
    }
  }
  return legacyCanReviewLicenseApplications(viewer)
}
