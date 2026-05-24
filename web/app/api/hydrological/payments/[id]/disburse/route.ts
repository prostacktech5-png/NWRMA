import { tryRespondWithDbSetupHint } from '@/lib/db'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { paymentToJson } from '@/lib/hydro-api-json'
import { getFinanceApiStore, commitFinanceApiStore } from '@/lib/finance-api-store'
import { canDisburseHydroPayments } from '@/lib/hydro-payment-policy'
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
    if (!canDisburseHydroPayments(viewer)) {
      return Response.json(
        {
          error:
            'Only Finance, the Director General, or an administrator can mark hydro officer payments as disbursed after approval.',
        },
        { status: 403 }
      )
    }
    const actor = viewer.id
    const { id } = await ctx.params
    const store = await getHydroPaymentStore()
    const row = store.payments.find((p) => p.id === id)
    if (!row) {
      return Response.json({ error: 'Payment not found.' }, { status: 404 })
    }
    if (row.status !== 'approved') {
      return Response.json(
        { error: 'Only approved payments can be disbursed.' },
        { status: 400 }
      )
    }
    const finance = await getFinanceApiStore()
    const utilization = finance.tryApplyUtilizationForDepartment('hydrological', row.totalSle)
    if (!utilization.ok) {
      return Response.json({ error: utilization.error }, { status: 400 })
    }
    const result = store.disburse(id, actor)
    if (!result.ok) {
      utilization.rollback()
      const status = result.code === 'conflict' ? 409 : result.code === 'not_found' ? 404 : 400
      return Response.json({ error: result.message }, { status })
    }
    await commitHydroPaymentStore(store)
    await commitFinanceApiStore(finance)
    return Response.json({ payment: paymentToJson(result.payment) })
  })
}
