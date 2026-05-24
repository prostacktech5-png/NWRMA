import { tryRespondWithDbSetupHint } from '@/lib/db'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { canHr } from '@/lib/hr-access-policy'
import { createHrAsset, hrAssetToJson, listHrAssets } from '@/lib/hr-asset-store'
import { importHrEmployeesFromErpIfEmpty } from '@/lib/hr-migrate-from-erp'

export async function GET(req: Request) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 })
    }
    if (!canHr(viewer, 'view_assets')) {
      return Response.json({ error: 'HR access required.' }, { status: 403 })
    }
    await importHrEmployeesFromErpIfEmpty()
    const assets = await listHrAssets()
    return Response.json({ assets: assets.map(hrAssetToJson) })
  })
}

export async function POST(req: Request) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 })
    }
    if (!canHr(viewer, 'manage_assets')) {
      return Response.json({ error: 'Not allowed to manage assets.' }, { status: 403 })
    }
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const assetTag = String(body.assetTag ?? body.tag ?? '').trim()
    const name = String(body.name ?? '').trim()
    const category = String(body.category ?? '').trim()
    if (!assetTag || !name || !category) {
      return Response.json({ error: 'assetTag, name, and category are required.' }, { status: 400 })
    }
    const asset = await createHrAsset(
      {
        assetTag,
        name,
        category,
        serialNumber: body.serialNumber != null ? String(body.serialNumber) : null,
        condition: (body.condition as 'good' | 'fair' | 'poor' | 'damaged') ?? 'good',
        warrantyExpiry: body.warrantyExpiry != null ? String(body.warrantyExpiry) : null,
        location: String(body.location ?? ''),
        acquiredAt: body.acquiredAt != null ? String(body.acquiredAt) : null,
        cost: body.cost != null ? Number(body.cost) : null,
        notes: String(body.notes ?? ''),
      },
      viewer.id
    )
    return Response.json({ asset: hrAssetToJson(asset) }, { status: 201 })
  })
}
