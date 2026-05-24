import { tryRespondWithDbSetupHint } from '@/lib/db'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { respondErpPortalRequestFormGet } from '@/lib/erp-portal-request-get'
import { submitErpPortalStaffRequest } from '@/lib/portal-request-submit'

export async function GET(req: Request) {
  return tryRespondWithDbSetupHint(() => respondErpPortalRequestFormGet(req))
}

export async function POST(req: Request) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 })
    }
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }
    const result = await submitErpPortalStaffRequest(viewer, body)
    if ('error' in result) {
      return Response.json({ error: result.error }, { status: result.status })
    }
    return Response.json({ id: result.id }, { status: 201 })
  })
}
