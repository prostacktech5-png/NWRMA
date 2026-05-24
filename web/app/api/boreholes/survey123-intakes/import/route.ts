import { tryRespondWithDbSetupHint } from '@/lib/db'
import { insertSurvey123Intake } from '@/lib/db/borehole-registry-persistence'
import { loadOrSeedErpReferencePayload } from '@/lib/db/reference-data-persistence'
import { canManageBoreholes } from '@/lib/borehole-registration'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { mapSurvey123Payload } from '@/lib/survey123-borehole-mapper'

export const dynamic = 'force-dynamic'

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

    let raw: Record<string, unknown>
    try {
      raw = (await req.json()) as Record<string, unknown>
    } catch {
      return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const fields = mapSurvey123Payload(raw)
    const erp = await loadOrSeedErpReferencePayload()
    const { intake, validationErrors } = await insertSurvey123Intake({
      fields,
      source: 'manual_import',
      rawPayload: raw,
      drillingCompanies: erp.drillingCompanies,
    })
    return Response.json({ ok: true, intake, validationErrors })
  })
}
