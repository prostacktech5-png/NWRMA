import { tryRespondWithDbSetupHint } from '@/lib/db'
import {
  loadOrSeedErpReferencePayload,
  saveErpReferencePayload,
} from '@/lib/db/reference-data-persistence'
import {
  getSurvey123IntakeById,
  registerBorehole,
} from '@/lib/db/borehole-registry-persistence'
import {
  appendBoreholeToErpPayload,
  boreholeFromRegistration,
  canManageBoreholes,
} from '@/lib/borehole-registration'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'

export const dynamic = 'force-dynamic'

type RegisterBody = {
  drillingCompanyId: string
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
}

export async function POST(req: Request) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) {
      return Response.json(
        { error: 'Send X-Acting-User-Id to identify the ERP user (demo auth).' },
        { status: 401 }
      )
    }
    if (!canManageBoreholes(viewer)) {
      return Response.json({ error: 'Boreholes department access required.' }, { status: 403 })
    }

    let body: RegisterBody
    try {
      body = (await req.json()) as RegisterBody
    } catch {
      return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const drillingCompanyId = body.drillingCompanyId?.trim()
    if (!drillingCompanyId) {
      return Response.json({ error: 'Licensed drilling company is required.' }, { status: 400 })
    }
    if (!body.regionId || !body.districtId || !body.chiefdomId || !body.settlementTypeId) {
      return Response.json(
        { error: 'Region, district, chiefdom, and settlement type are required.' },
        { status: 400 }
      )
    }

    const payload = await loadOrSeedErpReferencePayload()
    const company = payload.drillingCompanies.find((c) => c.id === drillingCompanyId)
    if (!company) {
      return Response.json({ error: 'Drilling company not found.' }, { status: 400 })
    }
    if (company.status !== 'active') {
      return Response.json(
        { error: 'Only active licensed drilling companies can register boreholes.' },
        { status: 400 }
      )
    }

    if (body.survey123IntakeId) {
      const intake = await getSurvey123IntakeById(body.survey123IntakeId)
      if (!intake) {
        return Response.json({ error: 'Survey123 intake not found.' }, { status: 400 })
      }
      if (intake.status === 'registered') {
        return Response.json({ error: 'This intake is already registered.' }, { status: 400 })
      }
    }

    try {
      const result = await registerBorehole({
        drillingCompanyId: company.id,
        drillingCompanyName: company.name,
        regionId: body.regionId,
        districtId: body.districtId,
        chiefdomId: body.chiefdomId,
        settlementTypeId: body.settlementTypeId,
        survey123IntakeId: body.survey123IntakeId ?? null,
        locationDescription: body.locationDescription ?? null,
        lat: body.lat ?? null,
        lng: body.lng ?? null,
        drillingMethod: body.drillingMethod ?? null,
        boreholeDepthM: body.boreholeDepthM ?? null,
        overburdenDepthM: body.overburdenDepthM ?? null,
        waterStrikeDepthsM: body.waterStrikeDepthsM ?? null,
        permanentCasingType: body.permanentCasingType ?? null,
        yieldLps: body.yieldLps ?? null,
        transmissivity: body.transmissivity ?? null,
        hydraulicConductivity: body.hydraulicConductivity ?? null,
        waterQualityPhysical: body.waterQualityPhysical ?? null,
        purpose: body.purpose ?? '',
        ownerName: body.ownerName ?? company.name,
      })

      const borehole = boreholeFromRegistration(result, {
        drillingCompanyId: company.id,
        drillingCompanyName: company.name,
        lat: body.lat ?? null,
        lng: body.lng ?? null,
        boreholeDepthM: body.boreholeDepthM ?? null,
        purpose: body.purpose ?? '',
        ownerName: body.ownerName ?? company.name,
        survey123IntakeId: body.survey123IntakeId ?? null,
        drillingMethod: body.drillingMethod ?? null,
        overburdenDepthM: body.overburdenDepthM ?? null,
        waterStrikeDepthsM: body.waterStrikeDepthsM ?? null,
        permanentCasingType: body.permanentCasingType ?? null,
        yieldLps: body.yieldLps ?? null,
        transmissivity: body.transmissivity ?? null,
        hydraulicConductivity: body.hydraulicConductivity ?? null,
        waterQualityPhysical: body.waterQualityPhysical ?? null,
        locationDescription: body.locationDescription ?? null,
      })

      await saveErpReferencePayload(appendBoreholeToErpPayload(payload, borehole))

      return Response.json({
        borehole_id: result.borehole_id,
        region: result.region,
        district: result.district,
        chiefdom: result.chiefdom,
        settlement_type: result.settlement_type,
        id: result.id,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed.'
      console.error('[boreholes/register]', err)
      return Response.json({ error: message }, { status: 500 })
    }
  })
}
