import { tryRespondWithDbSetupHint } from '@/lib/db'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { paymentToJson } from '@/lib/hydro-api-json'
import { canBulkSubmitHydroPaymentsToDg } from '@/lib/hydro-payment-policy'
import { commitHydroPaymentStore, getHydroPaymentStore } from '@/lib/hydro-payment-store'

type Body = { yearMonth: string }

export async function POST(req: Request) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) {
      return Response.json(
        { error: 'Send X-Acting-User-Id to identify the ERP user (demo auth).' },
        { status: 401 },
      )
    }
    if (!canBulkSubmitHydroPaymentsToDg(viewer)) {
      return Response.json(
        {
          error:
            'Only the Finance Head of Department (or an administrator) can submit officer payments to the Director General.',
        },
        { status: 403 },
      )
    }

    let body: Body
    try {
      body = (await req.json()) as Body
    } catch {
      return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }
    if (!body.yearMonth || !/^\d{4}-\d{2}$/.test(body.yearMonth)) {
      return Response.json(
        { error: 'yearMonth must be YYYY-MM.' },
        { status: 400 }
      )
    }
    const store = await getHydroPaymentStore()
    const { updated } = store.bulkSubmitMonth(body.yearMonth)
    const payments = store.listPayments({ yearMonth: body.yearMonth })
    await commitHydroPaymentStore(store)
    return Response.json({
      submittedCount: updated,
      payments: payments.map(paymentToJson),
    })
  })
}
