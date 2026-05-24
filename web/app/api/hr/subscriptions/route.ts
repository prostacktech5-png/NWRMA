import { tryRespondWithDbSetupHint } from '@/lib/db'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { canHr } from '@/lib/hr-access-policy'
import {
  createHrSubscription,
  hrSubscriptionToJson,
  listHrSubscriptions,
} from '@/lib/hr-subscription-store'
import type { HrSubscriptionType } from '@/lib/hr-types'

const TYPES = new Set(['software', 'insurance', 'certification', 'vendor', 'other'])

export async function GET(req: Request) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) return Response.json({ error: 'Authentication required.' }, { status: 401 })
    if (!canHr(viewer, 'view_subscriptions')) {
      return Response.json({ error: 'HR access required.' }, { status: 403 })
    }
    const url = new URL(req.url)
    const expiringWithin = url.searchParams.get('expiringWithin')
    const subs = await listHrSubscriptions({
      expiringWithinDays: expiringWithin != null ? Number(expiringWithin) : undefined,
    })
    return Response.json({ subscriptions: subs.map(hrSubscriptionToJson) })
  })
}

export async function POST(req: Request) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) return Response.json({ error: 'Authentication required.' }, { status: 401 })
    if (!canHr(viewer, 'manage_subscriptions')) {
      return Response.json({ error: 'Not allowed.' }, { status: 403 })
    }
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const name = String(body.name ?? '').trim()
    const expiresAt = String(body.expiresAt ?? '').trim()
    const type = String(body.subscriptionType ?? 'software').trim() as HrSubscriptionType
    if (!name || !expiresAt) {
      return Response.json({ error: 'name and expiresAt are required.' }, { status: 400 })
    }
    if (!TYPES.has(type)) {
      return Response.json({ error: 'Invalid subscription type.' }, { status: 400 })
    }
    const sub = await createHrSubscription(
      {
        name,
        subscriptionType: type,
        vendor: body.vendor != null ? String(body.vendor) : undefined,
        accountRef: body.accountRef != null ? String(body.accountRef) : undefined,
        cost: body.cost != null ? Number(body.cost) : null,
        currency: body.currency != null ? String(body.currency) : undefined,
        expiresAt,
        reminderDays: body.reminderDays != null ? Number(body.reminderDays) : undefined,
        notes: body.notes != null ? String(body.notes) : undefined,
      },
      viewer.id
    )
    return Response.json({ subscription: hrSubscriptionToJson(sub) }, { status: 201 })
  })
}
