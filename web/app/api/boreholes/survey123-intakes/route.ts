import { tryRespondWithDbSetupHint } from '@/lib/db'
import { listSurvey123Intakes } from '@/lib/db/borehole-registry-persistence'
import { loadOrSeedErpReferencePayload } from '@/lib/db/reference-data-persistence'
import { companyNameMap } from '@/lib/borehole-intake-approve'
import { canManageBoreholes } from '@/lib/borehole-registration'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import type { Survey123IntakeStatus } from '@/lib/types'

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

    const url = new URL(req.url)
    const statusParam = url.searchParams.get('status')
    const status =
      statusParam === 'received' || statusParam === 'registered' || statusParam === 'rejected'
        ? (statusParam as Survey123IntakeStatus)
        : undefined

    const erp = await loadOrSeedErpReferencePayload()
    const intakes = await listSurvey123Intakes(status, companyNameMap(erp.drillingCompanies))
    return Response.json({ intakes })
  })
}
