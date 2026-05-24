import type { ErpReferencePayload } from '@/lib/erp-reference-types'
import { getOnlineForm } from '@/lib/nwrma-site/online-forms/registry'
import {
  damSafetyApplicationStatusLabels,
  effluentDischargeApplicationStatusLabels,
  licenseApplicationStatusLabels,
  waterRightApplicationStatusLabels,
} from '@/lib/erp-formatting'
import { HYDROLOGICAL_APU_LIST_PATH } from '@/lib/online-form-application-review-access'

export { HYDROLOGICAL_APU_LIST_PATH }

import type {
  BoreholeLicenseApplication,
  DamSafetyApplication,
  EffluentDischargeApplication,
  OnlineFormPaymentIntake,
  WaterRightApplication,
} from '@/lib/types'

export const ONLINE_FORM_SLUGS = [
  'water-drilling-licence',
  'dam-safety',
  'effluent-discharge',
  'water-right',
] as const

export type OnlineFormSlug = (typeof ONLINE_FORM_SLUGS)[number]

export function isOnlineFormSlug(value: string): value is OnlineFormSlug {
  return (ONLINE_FORM_SLUGS as readonly string[]).includes(value)
}

export type ApuQueueItem = {
  id: string
  reference: string
  formSlug: OnlineFormSlug
  formLabel: string
  organisationName: string
  applicantName: string
  applicantEmail: string
  submittedAt: Date
  status: string
  statusLabel: string
  intakeReference: string | null
  reviewHref: string
}

type LinkedIntakeMeta = {
  formSlug: OnlineFormSlug
  intakeReference: string
}

function parseSubmittedAt(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value)
}

function linkedIntakesByApplicationId(
  intakes: OnlineFormPaymentIntake[]
): Map<string, LinkedIntakeMeta> {
  const map = new Map<string, LinkedIntakeMeta>()
  for (const intake of intakes) {
    if (!intake.linkedApplicationId || !isOnlineFormSlug(intake.formSlug)) continue
    map.set(intake.linkedApplicationId, {
      formSlug: intake.formSlug,
      intakeReference: intake.intakeReference,
    })
  }
  return map
}

export function apuReviewHref(formSlug: OnlineFormSlug, applicationId: string): string {
  return `${HYDROLOGICAL_APU_LIST_PATH}/${formSlug}/${applicationId}`
}

function statusLabel(formSlug: OnlineFormSlug, status: string): string {
  const maps: Record<OnlineFormSlug, Record<string, string>> = {
    'dam-safety': damSafetyApplicationStatusLabels,
    'effluent-discharge': effluentDischargeApplicationStatusLabels,
    'water-right': waterRightApplicationStatusLabels,
    'water-drilling-licence': licenseApplicationStatusLabels,
  }
  return maps[formSlug][status] ?? status
}

function pushDamSafety(
  items: ApuQueueItem[],
  apps: DamSafetyApplication[],
  linked: Map<string, LinkedIntakeMeta>
) {
  for (const app of apps) {
    const meta = linked.get(app.id)
    if (!meta || meta.formSlug !== 'dam-safety') continue
    items.push({
      id: app.id,
      reference: app.reference,
      formSlug: 'dam-safety',
      formLabel: getOnlineForm('dam-safety')?.title ?? 'Dam Safety Application',
      organisationName: app.organisationName,
      applicantName: app.applicantName,
      applicantEmail: app.applicantEmail,
      submittedAt: parseSubmittedAt(app.submittedAt),
      status: app.status,
      statusLabel: statusLabel('dam-safety', app.status),
      intakeReference: meta.intakeReference,
      reviewHref: apuReviewHref('dam-safety', app.id),
    })
  }
}

function pushEffluent(
  items: ApuQueueItem[],
  apps: EffluentDischargeApplication[],
  linked: Map<string, LinkedIntakeMeta>
) {
  for (const app of apps) {
    const meta = linked.get(app.id)
    if (!meta || meta.formSlug !== 'effluent-discharge') continue
    items.push({
      id: app.id,
      reference: app.reference,
      formSlug: 'effluent-discharge',
      formLabel: getOnlineForm('effluent-discharge')?.title ?? 'Effluent Discharge Application',
      organisationName: app.organisationName,
      applicantName: app.applicantName,
      applicantEmail: app.applicantEmail,
      submittedAt: parseSubmittedAt(app.submittedAt),
      status: app.status,
      statusLabel: statusLabel('effluent-discharge', app.status),
      intakeReference: meta.intakeReference,
      reviewHref: apuReviewHref('effluent-discharge', app.id),
    })
  }
}

function pushWaterRight(
  items: ApuQueueItem[],
  apps: WaterRightApplication[],
  linked: Map<string, LinkedIntakeMeta>
) {
  for (const app of apps) {
    const meta = linked.get(app.id)
    if (!meta || meta.formSlug !== 'water-right') continue
    items.push({
      id: app.id,
      reference: app.reference,
      formSlug: 'water-right',
      formLabel: getOnlineForm('water-right')?.title ?? 'Water Right Application',
      organisationName: app.organisationName,
      applicantName: app.applicantName,
      applicantEmail: app.applicantEmail,
      submittedAt: parseSubmittedAt(app.submittedAt),
      status: app.status,
      statusLabel: statusLabel('water-right', app.status),
      intakeReference: meta.intakeReference,
      reviewHref: apuReviewHref('water-right', app.id),
    })
  }
}

function pushWaterDrilling(
  items: ApuQueueItem[],
  apps: BoreholeLicenseApplication[],
  linked: Map<string, LinkedIntakeMeta>
) {
  for (const app of apps) {
    const meta = linked.get(app.id)
    if (!meta || meta.formSlug !== 'water-drilling-licence') continue
    items.push({
      id: app.id,
      reference: app.reference,
      formSlug: 'water-drilling-licence',
      formLabel:
        getOnlineForm('water-drilling-licence')?.title ?? 'Application for Water Drilling Licence',
      organisationName: app.organisationName,
      applicantName: app.applicantName,
      applicantEmail: app.applicantEmail,
      submittedAt: parseSubmittedAt(app.submittedAt),
      status: app.status,
      statusLabel: statusLabel('water-drilling-licence', app.status),
      intakeReference: meta.intakeReference,
      reviewHref: apuReviewHref('water-drilling-licence', app.id),
    })
  }
}

/** Portal submissions linked to a validated payment intake (Finance-approved receipt flow). */
export function buildHydrologicalApuQueue(payload: ErpReferencePayload): ApuQueueItem[] {
  const linked = linkedIntakesByApplicationId(payload.onlineFormPaymentIntakes ?? [])
  const items: ApuQueueItem[] = []
  pushDamSafety(items, payload.damSafetyApplications ?? [], linked)
  pushEffluent(items, payload.effluentDischargeApplications ?? [], linked)
  pushWaterRight(items, payload.waterRightApplications ?? [], linked)
  pushWaterDrilling(items, payload.licenseApplications ?? [], linked)
  return items.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
}

export function findLinkedPaymentIntake(
  payload: ErpReferencePayload,
  formSlug: OnlineFormSlug,
  applicationId: string
) {
  return (payload.onlineFormPaymentIntakes ?? []).find(
    (i) => i.formSlug === formSlug && i.linkedApplicationId === applicationId
  )
}

export function apuFormTitle(formSlug: OnlineFormSlug): string {
  return getOnlineForm(formSlug)?.title ?? formSlug
}

export function apuQueueMetrics(items: ApuQueueItem[]) {
  const pending = items.filter((i) =>
    ['submitted', 'under_review', 'additional_info_required'].includes(i.status)
  ).length
  return {
    total: items.length,
    pending,
    submitted: items.filter((i) => i.status === 'submitted').length,
    approved: items.filter((i) => i.status === 'approved').length,
  }
}
