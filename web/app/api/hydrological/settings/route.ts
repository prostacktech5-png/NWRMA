import { tryRespondWithDbSetupHint } from '@/lib/db'
import { commitHydroPaymentStore, getHydroPaymentStore } from '@/lib/hydro-payment-store'
import { authorizeHydrologicalSettingsAccess } from '@/lib/hydro-settings-access'

export async function GET(req: Request) {
  return tryRespondWithDbSetupHint(async () => {
    const auth = await authorizeHydrologicalSettingsAccess(req)
    if (!auth.ok) {
      return Response.json({ error: auth.error }, { status: auth.status })
    }
    const store = await getHydroPaymentStore()
    const raw = String(store.settings.perReadingRateSle)
    return Response.json({
      settings: store.settings,
      gaugeSubmissionRate: Number.parseFloat(raw) || 0,
      gaugeSubmissionRateRaw: raw,
    })
  })
}

type Body = {
  perReadingRateSle?: number
  /** Alias for `perReadingRateSle` (NLe per valid submission) — matches ERP settings UI. */
  gaugeSubmissionRate?: number
  fieldAppKey?: string
}

export async function PATCH(req: Request) {
  const auth = await authorizeHydrologicalSettingsAccess(req)
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const rate =
    body.gaugeSubmissionRate !== undefined ? body.gaugeSubmissionRate : body.perReadingRateSle

  if (rate !== undefined) {
    if (typeof rate !== 'number' || rate < 0 || !Number.isFinite(rate)) {
      return Response.json({ error: 'Rate must be a non-negative number.' }, { status: 400 })
    }
  }

  return tryRespondWithDbSetupHint(async () => {
    const store = await getHydroPaymentStore()
    store.patchSettings({
      perReadingRateSle: rate,
      fieldAppKey: body.fieldAppKey,
    })

    const pendingCount = store.payments.filter((p) => p.status === 'pending').length

    await commitHydroPaymentStore(store)

    return Response.json({
      settings: store.settings,
      gaugeSubmissionRate: store.settings.perReadingRateSle,
      gaugeSubmissionRateRaw: String(store.settings.perReadingRateSle),
      recalculatedPendingPayments: rate !== undefined ? pendingCount : undefined,
    })
  })
}
