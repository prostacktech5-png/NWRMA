import { tryRespondWithDbSetupHint } from '@/lib/db'
import { getHydroPaymentStore } from '@/lib/hydro-payment-store'
import { paymentToJson } from '@/lib/hydro-api-json'

const STATUSES = new Set(['pending', 'submitted', 'approved', 'disbursed'])

export async function GET(req: Request) {
  return tryRespondWithDbSetupHint(async () => {
    const { searchParams } = new URL(req.url)
    const yearMonth = searchParams.get('month') ?? undefined
    const status = searchParams.get('status') ?? undefined
    if (status && !STATUSES.has(status)) {
      return Response.json(
        {
          error: 'Invalid status filter.',
          allowed: ['pending', 'submitted', 'approved', 'disbursed'],
        },
        { status: 400 }
      )
    }
    const store = await getHydroPaymentStore()
    const list = store.listPayments({ yearMonth, status })
    return Response.json({
      payments: list.map(paymentToJson),
      metrics: store.metrics(),
      perReadingRateSle: store.settings.perReadingRateSle,
    })
  })
}
