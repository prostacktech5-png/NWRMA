import type { ErpReferencePayload } from '@/lib/erp-reference-types'
import type { OnlineFormSlug } from '@/lib/nwrma-site/online-forms/applicant-gate'
import { isOnlineFormSlug } from '@/lib/online-form-payment-intake'
import type { OnlineFormPaymentIntake } from '@/lib/types'

export type LinkedOnlineFormApplication = {
  id: string
  reference: string
  status: string
  organisationName: string
  email: string
}

function normIdentity(value: string): string {
  return value.trim().toLowerCase()
}

function mapApplication(
  app: {
    id: string
    reference: string
    status: string
    organisationName: string
    applicantEmail?: string
    email?: string
  }
): LinkedOnlineFormApplication {
  return {
    id: app.id,
    reference: app.reference,
    status: app.status,
    organisationName: app.organisationName,
    email: (app.applicantEmail ?? app.email ?? '').trim(),
  }
}

export function findLinkedOnlineFormApplication(
  payload: ErpReferencePayload,
  formSlug: string,
  applicationId: string
): LinkedOnlineFormApplication | null {
  if (!isOnlineFormSlug(formSlug)) return null

  switch (formSlug as OnlineFormSlug) {
    case 'dam-safety': {
      const app = (payload.damSafetyApplications ?? []).find((a) => a.id === applicationId)
      return app ? mapApplication(app) : null
    }
    case 'effluent-discharge': {
      const app = (payload.effluentDischargeApplications ?? []).find((a) => a.id === applicationId)
      return app ? mapApplication(app) : null
    }
    case 'water-right': {
      const app = (payload.waterRightApplications ?? []).find((a) => a.id === applicationId)
      return app ? mapApplication(app) : null
    }
    case 'water-drilling-licence': {
      const app = payload.licenseApplications.find((a) => a.id === applicationId)
      return app
        ? mapApplication({
            id: app.id,
            reference: app.reference,
            status: app.status,
            organisationName: app.organisationName,
            email: app.email,
          })
        : null
    }
    default:
      return null
  }
}

export function intakeRequiresNewPayment(
  payload: ErpReferencePayload,
  intake: OnlineFormPaymentIntake
): {
  required: boolean
  message?: string
  applicationReference?: string
  applicationStatus?: string
} {
  if (!intake.linkedApplicationId) {
    return { required: false }
  }

  const app = findLinkedOnlineFormApplication(
    payload,
    intake.formSlug,
    intake.linkedApplicationId
  )

  if (!app) {
    return {
      required: true,
      message:
        'This payment intake was already used for a submitted application. Upload a new bank receipt to apply again.',
    }
  }

  if (app.status === 'approved') {
    return {
      required: true,
      applicationReference: app.reference,
      applicationStatus: app.status,
      message: `Application ${app.reference} was approved. Upload a new bank receipt to submit another application.`,
    }
  }

  if (app.status === 'rejected') {
    return {
      required: true,
      applicationReference: app.reference,
      applicationStatus: app.status,
      message: `Application ${app.reference} was not approved. Upload a new bank receipt to submit a new application.`,
    }
  }

  return {
    required: true,
    applicationReference: app.reference,
    applicationStatus: app.status,
    message: `Payment intake ${intake.intakeReference} is already linked to application ${app.reference}. Upload a new bank receipt only if you are starting a separate new application.`,
  }
}

export function hasApprovedApplicationForIdentity(
  payload: ErpReferencePayload,
  formSlug: OnlineFormSlug,
  organisationName: string,
  email: string
): LinkedOnlineFormApplication | null {
  const org = normIdentity(organisationName)
  const mail = normIdentity(email)
  if (!org || !mail) return null

  const candidates: LinkedOnlineFormApplication[] = []
  switch (formSlug) {
    case 'dam-safety':
      candidates.push(...(payload.damSafetyApplications ?? []).map(mapApplication))
      break
    case 'effluent-discharge':
      candidates.push(...(payload.effluentDischargeApplications ?? []).map(mapApplication))
      break
    case 'water-right':
      candidates.push(...(payload.waterRightApplications ?? []).map(mapApplication))
      break
    case 'water-drilling-licence':
      candidates.push(
        ...payload.licenseApplications.map((app) =>
          mapApplication({
            id: app.id,
            reference: app.reference,
            status: app.status,
            organisationName: app.organisationName,
            email: app.email,
          })
        )
      )
      break
    default:
      break
  }

  return (
    candidates.find(
      (app) =>
        app.status === 'approved' &&
        normIdentity(app.organisationName) === org &&
        normIdentity(app.email) === mail
    ) ?? null
  )
}
