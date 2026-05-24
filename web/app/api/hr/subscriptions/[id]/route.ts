import { tryRespondWithDbSetupHint } from '@/lib/db'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { canHr } from '@/lib/hr-access-policy'
import {
  archiveHrSubscription,
  getHrSubscriptionById,
  hrSubscriptionToJson,
  updateHrSubscription,
} from '@/lib/hr-subscription-store'
import type { HrSubscriptionStatus, HrSubscriptionType } from '@/lib/hr-types'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Params) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) return Response.json({ error: 'Authentication required.' }, { status: 401 })
    if (!canHr(viewer, 'view_subscriptions')) {
      return Response.json({ error: 'HR access required.' }, { status: 403 })
    }
    const { id } = await params
    const sub = await getHrSubscriptionById(id)
    if (!sub) return Response.json({ error: 'Not found.' }, { status: 404 })
    return Response.json({ subscription: hrSubscriptionToJson(sub) })
  })
}

export async function PATCH(req: Request, { params }: Params) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) return Response.json({ error: 'Authentication required.' }, { status: 401 })
    if (!canHr(viewer, 'manage_subscriptions')) {
      return Response.json({ error: 'Not allowed.' }, { status: 403 })
    }
    const { id } = await params
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const sub = await updateHrSubscription(
      id,
      {
        name: body.name != null ? String(body.name) : undefined,
        subscriptionType: body.subscriptionType as HrSubscriptionType | undefined,
        vendor: body.vendor != null ? String(body.vendor) : undefined,
        accountRef: body.accountRef != null ? String(body.accountRef) : undefined,
        cost: body.cost != null ? Number(body.cost) : undefined,
        currency: body.currency != null ? String(body.currency) : undefined,
        expiresAt: body.expiresAt != null ? String(body.expiresAt) : undefined,
        status: body.status as HrSubscriptionStatus | undefined,
        reminderDays: body.reminderDays != null ? Number(body.reminderDays) : undefined,
        notes: body.notes != null ? String(body.notes) : undefined,
      },
      viewer.id
    )
    if (!sub) return Response.json({ error: 'Not found.' }, { status: 404 })
    return Response.json({ subscription: hrSubscriptionToJson(sub) })
  })
}

export async function DELETE(req: Request, { params }: Params) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) return Response.json({ error: 'Authentication required.' }, { status: 401 })
    if (!canHr(viewer, 'manage_subscriptions')) {
      return Response.json({ error: 'Not allowed.' }, { status: 403 })
    }
    const { id } = await params
    const sub = await archiveHrSubscription(id, viewer.id)
    if (!sub) return Response.json({ error: 'Not found.' }, { status: 404 })
    return Response.json({ subscription: hrSubscriptionToJson(sub) })
  })
}
