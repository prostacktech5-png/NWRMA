import { tryRespondWithDbSetupHint } from '@/lib/db'
import { insertSurvey123Intake } from '@/lib/db/borehole-registry-persistence'
import { loadOrSeedErpReferencePayload } from '@/lib/db/reference-data-persistence'
import { canManageBoreholes } from '@/lib/borehole-registration'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { SURVEY123_DEMO_INTAKES } from '@/lib/seed-survey123-demo-intakes'

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

    const erp = await loadOrSeedErpReferencePayload()
    const results: { label: string; intakeId: string; validationErrors: string[] }[] = []

    for (const demo of SURVEY123_DEMO_INTAKES) {
      const { intake, validationErrors } = await insertSurvey123Intake({
        fields: demo.fields,
        source: 'manual_import',
        rawPayload: demo.fields as unknown as Record<string, unknown>,
        drillingCompanies: erp.drillingCompanies,
      })
      results.push({
        label: demo.label,
        intakeId: intake.id,
        validationErrors,
      })
    }

    return Response.json({
      ok: true,
      created: results.length,
      results,
    })
  })
}
