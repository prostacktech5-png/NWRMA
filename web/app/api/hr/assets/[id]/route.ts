import { tryRespondWithDbSetupHint } from '@/lib/db'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { canHr } from '@/lib/hr-access-policy'
import { getHrAssetById, hrAssetToJson, updateHrAsset } from '@/lib/hr-asset-store'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Params) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 })
    }
    if (!canHr(viewer, 'view_assets')) {
      return Response.json({ error: 'HR access required.' }, { status: 403 })
    }
    const { id } = await params
    const asset = await getHrAssetById(id)
    if (!asset) {
      return Response.json({ error: 'Asset not found.' }, { status: 404 })
    }
    return Response.json({ asset: hrAssetToJson(asset) })
  })
}

export async function PATCH(req: Request, { params }: Params) {
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
    const asset = await updateHrAsset(
      id,
      {
        name: body.name != null ? String(body.name) : undefined,
        category: body.category != null ? String(body.category) : undefined,
        condition: body.condition as 'good' | 'fair' | 'poor' | 'damaged' | undefined,
        status: body.status as 'in_use' | 'in_storage' | 'maintenance' | 'disposed' | undefined,
        location: body.location != null ? String(body.location) : undefined,
        notes: body.notes != null ? String(body.notes) : undefined,
      },
      viewer.id
    )
    if (!asset) {
      return Response.json({ error: 'Asset not found.' }, { status: 404 })
    }
    return Response.json({ asset: hrAssetToJson(asset) })
  })
}
