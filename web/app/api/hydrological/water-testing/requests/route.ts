import { tryRespondWithDbSetupHint } from '@/lib/db'
import { listWaterTestingRequests } from '@/lib/db/water-testing-persistence'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { canManageWaterTestingRequests } from '@/lib/water-testing-access'

function serializeRequest(row: Awaited<ReturnType<typeof listWaterTestingRequests>>[number]) {
  return {
    ...row,
    receivedAt: row.receivedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    sampleCollectionScheduledAt: row.sampleCollectionScheduledAt?.toISOString() ?? null,
  }
}

export async function GET(req: Request) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) {
      return Response.json(
        { error: 'Send X-Acting-User-Id to identify the ERP user (demo auth).' },
        { status: 401 },
      )
    }
    if (!canManageWaterTestingRequests(viewer)) {
      return Response.json({ error: 'You do not have access to water testing requests.' }, { status: 403 })
    }

    const url = new URL(req.url)
    const status = url.searchParams.get('status')?.trim() || undefined
    const items = await listWaterTestingRequests({ status })
    return Response.json({ ok: true, items: items.map(serializeRequest) })
  })
}
