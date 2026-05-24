import { tryRespondWithDbSetupHint } from '@/lib/db'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { canHr } from '@/lib/hr-access-policy'
import { notifySubscriptionRenewal } from '@/lib/hr-subscription-notify'
import { getHrSubscriptionById } from '@/lib/hr-subscription-store'
import { getSmtpConfig } from '@/lib/mail'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) return Response.json({ error: 'Authentication required.' }, { status: 401 })
    if (!canHr(viewer, 'manage_subscriptions')) {
      return Response.json({ error: 'Not allowed.' }, { status: 403 })
    }
    const { id } = await params
    const sub = await getHrSubscriptionById(id)
    if (!sub) return Response.json({ error: 'Not found.' }, { status: 404 })

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const to =
      String(body.to ?? '').trim() ||
      getSmtpConfig()?.user ||
      viewer.email ||
      ''
    const result = await notifySubscriptionRenewal({ subscription: sub, to })
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 })
    return Response.json({ ok: true })
  })
}
