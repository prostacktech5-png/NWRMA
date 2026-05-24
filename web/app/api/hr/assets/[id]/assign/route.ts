import { tryRespondWithDbSetupHint } from '@/lib/db'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { canHr } from '@/lib/hr-access-policy'
import { assignHrAsset, hrAssetToJson, returnHrAsset } from '@/lib/hr-asset-store'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 })
    }
    if (!canHr(viewer, 'manage_assets')) {
      return Response.json({ error: 'Not allowed.' }, { status: 403 })
    }
    const { id } = await params
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const action = String(body.action ?? 'assign')

    if (action === 'return') {
      const asset = await returnHrAsset(id, String(body.notes ?? ''), viewer.id)
      if (!asset) {
        return Response.json({ error: 'Asset not found.' }, { status: 404 })
      }
      return Response.json({ asset: hrAssetToJson(asset) })
    }

    const employeeId = String(body.employeeId ?? '').trim()
    if (!employeeId) {
      return Response.json({ error: 'employeeId is required for assign.' }, { status: 400 })
    }
    const asset = await assignHrAsset(
      id,
      employeeId,
      String(body.notes ?? ''),
      viewer.id
    )
    if (!asset) {
      return Response.json({ error: 'Asset or employee not found.' }, { status: 404 })
    }
    return Response.json({ asset: hrAssetToJson(asset) })
  })
}
