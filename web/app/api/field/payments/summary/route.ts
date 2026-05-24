import { tryRespondWithDbSetupHint } from '@/lib/db'
import { getHydroPaymentStore, type HydroPaymentStore } from '@/lib/hydro-payment-store'
import { paymentToJson } from '@/lib/hydro-api-json'
import type { GaugeOfficer } from '@/lib/types'

function unauthorized(msg: string) {
  return Response.json({ error: msg }, { status: 401 })
}

function resolveOfficer(req: Request, store: HydroPaymentStore): GaugeOfficer | Response {
  const key = req.headers.get('x-field-app-key')
  if (!key) {
    return unauthorized('Missing X-Field-App-Key.')
  }
  if (key === store.settings.fieldAppKey) {
    const oid = req.headers.get('x-gauge-officer-id')
    if (!oid) {
      return Response.json(
        {
          error:
            'When using the shared field app key, send X-Gauge-Officer-Id for the authenticated officer.',
        },
        { status: 400 }
      )
    }
    const officer = store.findOfficerById(oid)
    if (!officer) {
      return unauthorized('Unknown gauge officer id.')
    }
    return officer
  }
  const officer = store.officers.find((o) => o.fieldAppKey === key)
  if (!officer) {
    return unauthorized('Invalid field app key.')
  }
  return officer
}

export async function GET(req: Request) {
  return tryRespondWithDbSetupHint(async () => {
    const store = await getHydroPaymentStore()
    const officerOrErr = resolveOfficer(req, store)
    if (officerOrErr instanceof Response) return officerOrErr

    const payments = store.payments.filter((p) => p.gaugeOfficerId === officerOrErr.id)
    return Response.json({
      officer: {
        id: officerOrErr.id,
        fullName: officerOrErr.fullName,
      },
      payments: payments.map(paymentToJson),
    })
  })
}
