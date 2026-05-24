import { tryRespondWithDbSetupHint } from '@/lib/db'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { paymentToJson } from '@/lib/hydro-api-json'
import { canApproveHydroPaymentsAsDg } from '@/lib/hydro-payment-policy'
import { commitHydroPaymentStore, getHydroPaymentStore } from '@/lib/hydro-payment-store'

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) {
      return Response.json(
        { error: 'Send X-Acting-User-Id to identify the ERP user (demo auth).' },
        { status: 401 }
      )
    }
    if (!canApproveHydroPaymentsAsDg(viewer)) {
      return Response.json(
        {
          error:
            'Only the Director General (or an administrator) can approve payments after Finance HoD has submitted them.',
        },
        { status: 403 }
      )
    }
    const actor = viewer.id
    const { id } = await ctx.params
    const store = await getHydroPaymentStore()
    const result = store.approve(id, actor)
    if (!result.ok) {
      const status = result.code === 'conflict' ? 409 : result.code === 'not_found' ? 404 : 400
      return Response.json({ error: result.message }, { status })
    }
    await commitHydroPaymentStore(store)
    return Response.json({ payment: paymentToJson(result.payment) })
  })
}
