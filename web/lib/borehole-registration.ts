import type { RegisterBoreholeResult } from '@/lib/db/borehole-registry-persistence'
import type { ErpReferencePayload } from '@/lib/erp-reference-types'
import type { Borehole } from '@/lib/types'

export { canReviewLicenseApplications as canManageBoreholes } from '@/lib/borehole-license-application'

export function boreholeFromRegistration(
  result: RegisterBoreholeResult,
  input: {
    drillingCompanyId: string
    drillingCompanyName: string
    lat: number | null
    lng: number | null
    boreholeDepthM: number | null
    purpose: string
    ownerName: string
    survey123IntakeId?: string | null
    drillingMethod?: string | null
    overburdenDepthM?: number | null
    waterStrikeDepthsM?: number[] | null
    permanentCasingType?: string | null
    yieldLps?: number | null
    transmissivity?: number | null
    hydraulicConductivity?: number | null
    waterQualityPhysical?: Record<string, unknown> | null
    locationDescription?: string | null
  }
): Borehole {
  return {
    id: result.id,
    code: result.borehole_id,
    boreholeId: result.borehole_id,
    region: result.region,
    district: result.district,
    chiefdom: result.chiefdom,
    settlementType: result.settlement_type,
    lat: input.lat,
    lng: input.lng,
    depthM: input.boreholeDepthM,
    purpose: input.purpose,
    ownerName: input.ownerName,
    drillingCompanyId: input.drillingCompanyId,
    drillingCompanyName: input.drillingCompanyName,
    survey123IntakeId: input.survey123IntakeId ?? null,
    drillingMethod: input.drillingMethod ?? null,
    overburdenDepthM: input.overburdenDepthM ?? null,
    waterStrikeDepthsM: input.waterStrikeDepthsM ?? null,
    permanentCasingType: input.permanentCasingType ?? null,
    yieldLps: input.yieldLps ?? null,
    transmissivity: input.transmissivity ?? null,
    hydraulicConductivity: input.hydraulicConductivity ?? null,
    waterQualityPhysical: input.waterQualityPhysical ?? null,
    locationDescription: input.locationDescription ?? null,
    registryStatus: 'pending',
    createdAt: new Date(),
  }
}

export function appendBoreholeToErpPayload(
  payload: ErpReferencePayload,
  borehole: Borehole
): ErpReferencePayload {
  const existing = payload.boreholes.find(
    (b) => b.id === borehole.id || b.boreholeId === borehole.boreholeId || b.code === borehole.code
  )
  if (existing) {
    return {
      ...payload,
      boreholes: payload.boreholes.map((b) =>
        b.id === borehole.id ? borehole : b
      ),
    }
  }
  return { ...payload, boreholes: [...payload.boreholes, borehole] }
}
