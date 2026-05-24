import { tryRespondWithDbSetupHint } from '@/lib/db'
import {
  getSurvey123IntakeById,
} from '@/lib/db/borehole-registry-persistence'
import { loadOrSeedErpReferencePayload } from '@/lib/db/reference-data-persistence'
import {
  approveSurvey123Intake,
  rejectIntakeWithReason,
} from '@/lib/borehole-intake-approve'
import { canManageBoreholes } from '@/lib/borehole-registration'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'

export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
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

    const { id } = await ctx.params
    const erp = await loadOrSeedErpReferencePayload()
    const base = await getSurvey123IntakeById(id)
    const company = base
      ? erp.drillingCompanies.find((c) => c.id === base.drillingCompanyId)
      : undefined
    const intake = await getSurvey123IntakeById(id, company?.name ?? null)
    if (!intake) {
      return Response.json({ error: 'Intake not found.' }, { status: 404 })
    }
    return Response.json({ intake })
  })
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
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

    const { id } = await ctx.params
    let body: { action?: string; rejectionReason?: string | null }
    try {
      body = (await req.json()) as { action?: string; rejectionReason?: string | null }
    } catch {
      return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const erp = await loadOrSeedErpReferencePayload()

    if (body.action === 'approve') {
      try {
        const result = await approveSurvey123Intake({
          intakeId: id,
          reviewedByUserId: viewer.id,
          drillingCompanies: erp.drillingCompanies,
        })
        const enriched = await getSurvey123IntakeById(
          id,
          erp.drillingCompanies.find((c) => c.id === result.intake.drillingCompanyId)?.name ??
            null
        )
        return Response.json({
          borehole_id: result.borehole_id,
          region: result.region,
          district: result.district,
          chiefdom: result.chiefdom,
          settlement_type: result.settlement_type,
          intake: enriched ?? result.intake,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Approval failed.'
        return Response.json({ error: message }, { status: 400 })
      }
    }

    if (body.action === 'reject') {
      try {
        const intake = await rejectIntakeWithReason({
          intakeId: id,
          rejectionReason: body.rejectionReason ?? null,
          reviewedByUserId: viewer.id,
        })
        const company = erp.drillingCompanies.find((c) => c.id === intake.drillingCompanyId)
        const enriched = await getSurvey123IntakeById(id, company?.name ?? null)
        return Response.json({ ok: true, intake: enriched ?? intake })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Rejection failed.'
        return Response.json({ error: message }, { status: 400 })
      }
    }

    return Response.json({ error: 'action must be approve or reject.' }, { status: 400 })
  })
}
