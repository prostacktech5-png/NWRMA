import { tryRespondWithDbSetupHint } from '@/lib/db'
import { loadAdministrativeHierarchy } from '@/lib/db/borehole-admin-persistence'
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

    const data = await loadAdministrativeHierarchy()
    return Response.json(data)
  })
}
