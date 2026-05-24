import { tryRespondWithDbSetupHint } from '@/lib/db'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { canHr } from '@/lib/hr-access-policy'
import { hrSubscriptionToJson, markSubscriptionRenewed } from '@/lib/hr-subscription-store'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) return Response.json({ error: 'Authentication required.' }, { status: 401 })
    if (!canHr(viewer, 'manage_subscriptions')) {
      return Response.json({ error: 'Not allowed.' }, { status: 403 })
    }
    const { id } = await params
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const newExpiresAt = String(body.expiresAt ?? '').trim()
    if (!newExpiresAt) {
      return Response.json({ error: 'expiresAt is required.' }, { status: 400 })
    }
    const sub = await markSubscriptionRenewed(id, newExpiresAt, viewer.id)
    if (!sub) return Response.json({ error: 'Not found.' }, { status: 404 })
    return Response.json({ subscription: hrSubscriptionToJson(sub) })
  })
}
