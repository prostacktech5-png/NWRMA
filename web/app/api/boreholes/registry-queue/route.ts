import { tryRespondWithDbSetupHint } from '@/lib/db'
import {
  listSurvey123Intakes,
  toIntakeSummary,
} from '@/lib/db/borehole-registry-persistence'
import { loadOrSeedErpReferencePayload } from '@/lib/db/reference-data-persistence'
import { companyNameMap } from '@/lib/borehole-intake-approve'
import { canManageBoreholes } from '@/lib/borehole-registration'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
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

    const erp = await loadOrSeedErpReferencePayload({ syncRegistry: false })
    const names = companyNameMap(erp.drillingCompanies)
    const pendingIntakes = await listSurvey123Intakes('received', names)
    const pending = pendingIntakes.map(toIntakeSummary)

    const approved = erp.boreholes.filter((b) => b.registryStatus === 'approved')

    return Response.json({ pending, approved })
  })
}
