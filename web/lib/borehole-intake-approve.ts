import {
  loadOrSeedErpReferencePayload,
  saveErpReferencePayload,
} from '@/lib/db/reference-data-persistence'
import {
  getSurvey123IntakeById,
  registerBorehole,
  rejectSurvey123Intake,
  type RegisterBoreholeResult,
} from '@/lib/db/borehole-registry-persistence'
import {
  appendBoreholeToErpPayload,
  boreholeFromRegistration,
} from '@/lib/borehole-registration'
import type { DrillingCompany, Survey123BoreholeIntake } from '@/lib/types'

export type ApproveIntakeResult = RegisterBoreholeResult & {
  intake: Survey123BoreholeIntake
}

export async function approveSurvey123Intake(params: {
  intakeId: string
  reviewedByUserId: string
  drillingCompanies: DrillingCompany[]
}): Promise<ApproveIntakeResult> {
  const intake = await getSurvey123IntakeById(params.intakeId)
  if (!intake) {
    throw new Error('Survey123 intake not found.')
  }
  if (intake.status !== 'received') {
    throw new Error('Only pending submissions can be approved.')
  }
  if (!intake.mappingComplete) {
    throw new Error(
      'Cannot approve: administrative mapping or licensed company match is incomplete.'
    )
  }
  if (!intake.drillingCompanyId) {
    throw new Error('Cannot approve: no matched licensed drilling company.')
  }

  const company = params.drillingCompanies.find((c) => c.id === intake.drillingCompanyId)
  if (!company || company.status !== 'active') {
    throw new Error('Matched drilling company is not active.')
  }

  const result = await registerBorehole({
    drillingCompanyId: company.id,
    drillingCompanyName: company.name,
    regionId: intake.regionId!,
    districtId: intake.districtId!,
    chiefdomId: intake.chiefdomId!,
    settlementTypeId: intake.settlementTypeId!,
    survey123IntakeId: intake.id,
    locationDescription: intake.locationDescription,
    lat: intake.lat,
    lng: intake.lng,
    drillingMethod: intake.drillingMethod,
    boreholeDepthM: intake.boreholeDepthM,
    overburdenDepthM: intake.overburdenDepthM,
    waterStrikeDepthsM: intake.waterStrikeDepthsM,
    permanentCasingType: intake.permanentCasingType,
    yieldLps: intake.yieldLps,
    transmissivity: intake.transmissivity,
    hydraulicConductivity: intake.hydraulicConductivity,
    waterQualityPhysical: intake.waterQualityPhysical,
    purpose: 'Water supply',
    ownerName: company.name,
    registryStatus: 'approved',
  })

  const { getSql } = await import('@/lib/db')
  const sql = getSql()
  await sql`
    UPDATE survey123_borehole_intakes
    SET reviewed_by_user_id = ${params.reviewedByUserId}
    WHERE id = ${params.intakeId}
  `

  const payload = await loadOrSeedErpReferencePayload()
  const borehole = boreholeFromRegistration(result, {
    drillingCompanyId: company.id,
    drillingCompanyName: company.name,
    lat: intake.lat,
    lng: intake.lng,
    boreholeDepthM: intake.boreholeDepthM,
    purpose: 'Water supply',
    ownerName: company.name,
    survey123IntakeId: intake.id,
    drillingMethod: intake.drillingMethod,
    overburdenDepthM: intake.overburdenDepthM,
    waterStrikeDepthsM: intake.waterStrikeDepthsM,
    permanentCasingType: intake.permanentCasingType,
    yieldLps: intake.yieldLps,
    transmissivity: intake.transmissivity,
    hydraulicConductivity: intake.hydraulicConductivity,
    waterQualityPhysical: intake.waterQualityPhysical,
    locationDescription: intake.locationDescription,
  })
  borehole.registryStatus = 'approved'
  await saveErpReferencePayload(appendBoreholeToErpPayload(payload, borehole))

  const updated = await getSurvey123IntakeById(params.intakeId, company.name)
  return { ...result, intake: updated! }
}

export async function rejectIntakeWithReason(params: {
  intakeId: string
  rejectionReason?: string | null
  reviewedByUserId: string
}): Promise<Survey123BoreholeIntake> {
  const existing = await getSurvey123IntakeById(params.intakeId)
  if (!existing) throw new Error('Survey123 intake not found.')
  if (existing.status !== 'received') {
    throw new Error('Only pending submissions can be rejected.')
  }
  const updated = await rejectSurvey123Intake(params)
  if (!updated) throw new Error('Failed to reject intake.')
  return updated
}

export function companyNameMap(companies: DrillingCompany[]): Map<string, string> {
  return new Map(companies.map((c) => [c.id, c.name]))
}
