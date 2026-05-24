import {
  buildIdPreview,
  matchDrillingCompany,
  resolveAdministrativeIds,
} from '@/lib/borehole-admin-resolve'
import { generateBoreholeId } from '@/lib/borehole-id-generator'
import { getSql } from '@/lib/db'
import { ensureAdministrativeData } from '@/lib/db/borehole-admin-persistence'
import type {
  BoreholeRegistryStatus,
  DrillingCompany,
  Survey123BoreholeIntake,
  Survey123BoreholeIntakeFields,
  Survey123IntakeStatus,
  Survey123IntakeSummary,
} from '@/lib/types'

export function newSurvey123IntakeId(): string {
  return `s123-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function newBoreholeRecordId(): string {
  return `bh-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function parseWaterStrikes(strikes: unknown): number[] | null {
  if (Array.isArray(strikes)) {
    return strikes.map((x) => Number(x)).filter((n) => Number.isFinite(n))
  }
  if (typeof strikes === 'string') {
    try {
      const parsed = JSON.parse(strikes) as unknown
      if (Array.isArray(parsed)) {
        return parsed.map((x) => Number(x)).filter((n) => Number.isFinite(n))
      }
    } catch {
      return null
    }
  }
  return null
}

function rowToIntake(r: Record<string, unknown>): Survey123BoreholeIntake {
  const wq = r.water_quality_physical
  let waterQualityPhysical: Record<string, unknown> | null = null
  if (wq != null && typeof wq === 'object' && !Array.isArray(wq)) {
    waterQualityPhysical = wq as Record<string, unknown>
  }

  const regionCode = r.region_code != null ? String(r.region_code) : null
  const districtCode = r.district_code != null ? String(r.district_code) : null
  const chiefdomCode = r.chiefdom_code != null ? String(r.chiefdom_code) : null
  const settlementCode = r.settlement_code != null ? String(r.settlement_code) : null

  const regionId = r.region_id != null ? String(r.region_id) : null
  const districtId = r.district_id != null ? String(r.district_id) : null
  const chiefdomId = r.chiefdom_id != null ? String(r.chiefdom_id) : null
  const settlementTypeId = r.settlement_type_id != null ? String(r.settlement_type_id) : null
  const drillingCompanyId = r.drilling_company_id != null ? String(r.drilling_company_id) : null

  const mappingComplete = Boolean(
    regionId && districtId && chiefdomId && settlementTypeId && drillingCompanyId
  )

  return {
    id: String(r.id),
    status: String(r.status) as Survey123IntakeStatus,
    source: String(r.source),
    drillingCompanyName:
      r.drilling_company_name != null ? String(r.drilling_company_name) : null,
    locationDescription:
      r.location_description != null ? String(r.location_description) : null,
    lat: r.lat != null ? Number(r.lat) : null,
    lng: r.lng != null ? Number(r.lng) : null,
    drillingMethod: r.drilling_method != null ? String(r.drilling_method) : null,
    boreholeDepthM: r.borehole_depth_m != null ? Number(r.borehole_depth_m) : null,
    overburdenDepthM: r.overburden_depth_m != null ? Number(r.overburden_depth_m) : null,
    waterStrikeDepthsM: parseWaterStrikes(r.water_strike_depths_m),
    permanentCasingType:
      r.permanent_casing_type != null ? String(r.permanent_casing_type) : null,
    yieldLps: r.yield_lps != null ? Number(r.yield_lps) : null,
    transmissivity: r.transmissivity != null ? Number(r.transmissivity) : null,
    hydraulicConductivity:
      r.hydraulic_conductivity != null ? Number(r.hydraulic_conductivity) : null,
    waterQualityPhysical,
    regionName: r.region_name != null ? String(r.region_name) : null,
    districtName: r.district_name != null ? String(r.district_name) : null,
    chiefdomName: r.chiefdom_name != null ? String(r.chiefdom_name) : null,
    settlementType:
      r.settlement_type_label != null ? String(r.settlement_type_label) : null,
    regionId,
    districtId,
    chiefdomId,
    settlementTypeId,
    drillingCompanyId,
    matchedCompanyName:
      r.matched_company_name != null ? String(r.matched_company_name) : null,
    regionLabel: r.region_label != null ? String(r.region_label) : null,
    districtLabel: r.district_label != null ? String(r.district_label) : null,
    chiefdomLabel: r.chiefdom_label != null ? String(r.chiefdom_label) : null,
    settlementLabel: r.settlement_label != null ? String(r.settlement_label) : null,
    regionCode,
    districtCode,
    chiefdomCode,
    settlementCode,
    idPreview: buildIdPreview({ regionCode, districtCode, chiefdomCode, settlementCode }),
    mappingComplete,
    registeredBoreholeId:
      r.registered_borehole_id != null ? String(r.registered_borehole_id) : null,
    registeredBoreholeCode:
      r.registered_borehole_code != null ? String(r.registered_borehole_code) : null,
    rejectionReason: r.rejection_reason != null ? String(r.rejection_reason) : null,
    reviewedAt: r.reviewed_at != null ? new Date(String(r.reviewed_at)) : null,
    receivedAt: new Date(String(r.received_at)),
    createdAt: new Date(String(r.created_at)),
  }
}

async function fetchIntakeRow(sql: ReturnType<typeof getSql>, id: string, companyName?: string | null) {
  const rows = (await sql`
    SELECT
      i.*,
      r.name AS region_label,
      r.code AS region_code,
      d.name AS district_label,
      d.code AS district_code,
      c.name AS chiefdom_label,
      c.code AS chiefdom_code,
      s.label AS settlement_label,
      s.code AS settlement_code,
      b.borehole_id AS registered_borehole_code
    FROM survey123_borehole_intakes i
    LEFT JOIN regions r ON r.id = i.region_id
    LEFT JOIN districts d ON d.id = i.district_id
    LEFT JOIN chiefdoms c ON c.id = i.chiefdom_id
    LEFT JOIN settlement_types s ON s.id = i.settlement_type_id
    LEFT JOIN boreholes b ON b.id = i.registered_borehole_id
    WHERE i.id = ${id}
  `) as Record<string, unknown>[]
  const row = rows[0]
  if (!row) return null
  if (companyName) row.matched_company_name = companyName
  return rowToIntake(row)
}

export type InsertSurvey123Result = {
  intake: Survey123BoreholeIntake
  validationErrors: string[]
}

export async function insertSurvey123Intake(params: {
  fields: Survey123BoreholeIntakeFields
  source: 'survey123_webhook' | 'manual_import'
  rawPayload?: Record<string, unknown>
  drillingCompanies?: DrillingCompany[]
}): Promise<InsertSurvey123Result> {
  await ensureAdministrativeData()
  const sql = getSql()
  const id = newSurvey123IntakeId()
  const f = params.fields

  const resolved = await resolveAdministrativeIds(sql, {
    regionName: f.regionName,
    districtName: f.districtName,
    chiefdomName: f.chiefdomName,
    settlementType: f.settlementType,
  })

  const companyMatch = matchDrillingCompany(
    params.drillingCompanies ?? [],
    f.drillingCompanyName
  )

  const validationErrors = [...resolved.errors]
  if (f.drillingCompanyName && !companyMatch) {
    validationErrors.push(
      `No active licensed drilling company matched "${f.drillingCompanyName}".`
    )
  }

  await sql`
    INSERT INTO survey123_borehole_intakes (
      id, status, source, raw_payload,
      drilling_company_name, location_description, lat, lng,
      drilling_method, borehole_depth_m, overburden_depth_m,
      water_strike_depths_m, permanent_casing_type, yield_lps,
      transmissivity, hydraulic_conductivity, water_quality_physical,
      region_id, district_id, chiefdom_id, settlement_type_id,
      drilling_company_id, region_name, district_name, chiefdom_name, settlement_type_label,
      received_at, created_at, updated_at
    ) VALUES (
      ${id}, 'received', ${params.source},
      ${params.rawPayload ? JSON.stringify(params.rawPayload) : null},
      ${f.drillingCompanyName}, ${f.locationDescription}, ${f.lat}, ${f.lng},
      ${f.drillingMethod}, ${f.boreholeDepthM}, ${f.overburdenDepthM},
      ${f.waterStrikeDepthsM ? JSON.stringify(f.waterStrikeDepthsM) : null},
      ${f.permanentCasingType}, ${f.yieldLps}, ${f.transmissivity},
      ${f.hydraulicConductivity},
      ${f.waterQualityPhysical ? JSON.stringify(f.waterQualityPhysical) : null},
      ${resolved.regionId}, ${resolved.districtId}, ${resolved.chiefdomId},
      ${resolved.settlementTypeId}, ${companyMatch?.id ?? null},
      ${f.regionName}, ${f.districtName}, ${f.chiefdomName},
      ${resolved.settlementLabel ?? f.settlementType},
      NOW(), NOW(), NOW()
    )
  `

  const intake = await getSurvey123IntakeById(id, companyMatch?.name ?? null)
  return { intake: intake!, validationErrors }
}

export async function listSurvey123Intakes(
  status?: Survey123IntakeStatus,
  companyNames?: Map<string, string>
): Promise<Survey123BoreholeIntake[]> {
  await ensureAdministrativeData()
  const sql = getSql()
  const rows = status
    ? ((await sql`
        SELECT
          i.*,
          r.name AS region_label,
          r.code AS region_code,
          d.name AS district_label,
          d.code AS district_code,
          c.name AS chiefdom_label,
          c.code AS chiefdom_code,
          s.label AS settlement_label,
          s.code AS settlement_code,
          b.borehole_id AS registered_borehole_code
        FROM survey123_borehole_intakes i
        LEFT JOIN regions r ON r.id = i.region_id
        LEFT JOIN districts d ON d.id = i.district_id
        LEFT JOIN chiefdoms c ON c.id = i.chiefdom_id
        LEFT JOIN settlement_types s ON s.id = i.settlement_type_id
        LEFT JOIN boreholes b ON b.id = i.registered_borehole_id
        WHERE i.status = ${status}
        ORDER BY i.received_at DESC
      `) as Record<string, unknown>[])
    : ((await sql`
        SELECT
          i.*,
          r.name AS region_label,
          r.code AS region_code,
          d.name AS district_label,
          d.code AS district_code,
          c.name AS chiefdom_label,
          c.code AS chiefdom_code,
          s.label AS settlement_label,
          s.code AS settlement_code,
          b.borehole_id AS registered_borehole_code
        FROM survey123_borehole_intakes i
        LEFT JOIN regions r ON r.id = i.region_id
        LEFT JOIN districts d ON d.id = i.district_id
        LEFT JOIN chiefdoms c ON c.id = i.chiefdom_id
        LEFT JOIN settlement_types s ON s.id = i.settlement_type_id
        LEFT JOIN boreholes b ON b.id = i.registered_borehole_id
        ORDER BY i.received_at DESC
      `) as Record<string, unknown>[])

  return rows.map((r) => {
    const cid = r.drilling_company_id != null ? String(r.drilling_company_id) : null
    if (cid && companyNames?.has(cid)) {
      r.matched_company_name = companyNames.get(cid)
    }
    return rowToIntake(r)
  })
}

export async function getSurvey123IntakeById(
  id: string,
  matchedCompanyName?: string | null
): Promise<Survey123BoreholeIntake | null> {
  await ensureAdministrativeData()
  const sql = getSql()
  const row = await fetchIntakeRow(sql, id, matchedCompanyName)
  return row
}

export function toIntakeSummary(intake: Survey123BoreholeIntake): Survey123IntakeSummary {
  return {
    id: intake.id,
    status: intake.status,
    drillingCompanyName: intake.drillingCompanyName,
    matchedCompanyName: intake.matchedCompanyName,
    drillingCompanyId: intake.drillingCompanyId,
    districtLabel: intake.districtLabel,
    chiefdomLabel: intake.chiefdomLabel,
    regionLabel: intake.regionLabel,
    settlementLabel: intake.settlementLabel,
    locationDescription: intake.locationDescription,
    receivedAt: intake.receivedAt,
    mappingComplete: intake.mappingComplete,
    idPreview: intake.idPreview,
  }
}

export async function rejectSurvey123Intake(params: {
  intakeId: string
  rejectionReason?: string | null
  reviewedByUserId: string
}): Promise<Survey123BoreholeIntake | null> {
  const sql = getSql()
  await sql`
    UPDATE survey123_borehole_intakes
    SET
      status = 'rejected',
      rejection_reason = ${params.rejectionReason ?? null},
      reviewed_at = NOW(),
      reviewed_by_user_id = ${params.reviewedByUserId},
      updated_at = NOW()
    WHERE id = ${params.intakeId} AND status = 'received'
  `
  return getSurvey123IntakeById(params.intakeId)
}

export type RegisterBoreholeInput = {
  drillingCompanyId: string
  drillingCompanyName: string
  regionId: string
  districtId: string
  chiefdomId: string
  settlementTypeId: string
  survey123IntakeId?: string | null
  locationDescription?: string | null
  lat?: number | null
  lng?: number | null
  drillingMethod?: string | null
  boreholeDepthM?: number | null
  overburdenDepthM?: number | null
  waterStrikeDepthsM?: number[] | null
  permanentCasingType?: string | null
  yieldLps?: number | null
  transmissivity?: number | null
  hydraulicConductivity?: number | null
  waterQualityPhysical?: Record<string, unknown> | null
  purpose?: string
  ownerName?: string
  registryStatus?: BoreholeRegistryStatus
}

export type RegisterBoreholeResult = {
  id: string
  borehole_id: string
  region: string
  district: string
  chiefdom: string
  settlement_type: string
}

export async function registerBorehole(
  input: RegisterBoreholeInput
): Promise<RegisterBoreholeResult> {
  await ensureAdministrativeData()
  const sql = getSql()
  const generated = await generateBoreholeId(sql, {
    regionId: input.regionId,
    districtId: input.districtId,
    chiefdomId: input.chiefdomId,
    settlementTypeId: input.settlementTypeId,
  })

  const id = newBoreholeRecordId()
  const registryStatus = input.registryStatus ?? 'approved'

  await sql`
    INSERT INTO boreholes (
      id, borehole_id, region_id, district_id, chiefdom_id, settlement_type_id,
      drilling_company_id, drilling_company_name, survey123_intake_id,
      location_description, lat, lng, drilling_method, borehole_depth_m,
      overburden_depth_m, water_strike_depths_m, permanent_casing_type,
      yield_lps, transmissivity, hydraulic_conductivity, water_quality_physical,
      purpose, owner_name, registry_status, created_at, updated_at
    ) VALUES (
      ${id}, ${generated.boreholeId}, ${input.regionId}, ${input.districtId},
      ${input.chiefdomId}, ${input.settlementTypeId},
      ${input.drillingCompanyId}, ${input.drillingCompanyName},
      ${input.survey123IntakeId ?? null},
      ${input.locationDescription ?? null}, ${input.lat ?? null}, ${input.lng ?? null},
      ${input.drillingMethod ?? null}, ${input.boreholeDepthM ?? null},
      ${input.overburdenDepthM ?? null},
      ${input.waterStrikeDepthsM ? JSON.stringify(input.waterStrikeDepthsM) : null},
      ${input.permanentCasingType ?? null}, ${input.yieldLps ?? null},
      ${input.transmissivity ?? null}, ${input.hydraulicConductivity ?? null},
      ${input.waterQualityPhysical ? JSON.stringify(input.waterQualityPhysical) : null},
      ${input.purpose ?? ''}, ${input.ownerName ?? ''}, ${registryStatus},
      NOW(), NOW()
    )
  `

  if (input.survey123IntakeId) {
    await sql`
      UPDATE survey123_borehole_intakes
      SET
        status = 'registered',
        registered_borehole_id = ${id},
        reviewed_at = NOW(),
        updated_at = NOW()
      WHERE id = ${input.survey123IntakeId}
    `
  }

  return {
    id,
    borehole_id: generated.boreholeId,
    region: generated.region,
    district: generated.district,
    chiefdom: generated.chiefdom,
    settlement_type: generated.settlement_type,
  }
}

export async function markIntakeReviewed(
  intakeId: string,
  reviewedByUserId: string
): Promise<void> {
  const sql = getSql()
  await sql`
    UPDATE survey123_borehole_intakes
    SET reviewed_by_user_id = ${reviewedByUserId}, reviewed_at = NOW(), updated_at = NOW()
    WHERE id = ${intakeId}
  `
}
