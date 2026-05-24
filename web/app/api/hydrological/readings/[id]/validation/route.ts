import { tryRespondWithDbSetupHint } from '@/lib/db'
import { commitHydroPaymentStore, getHydroPaymentStore } from '@/lib/hydro-payment-store'
import { readingToJson } from '@/lib/hydro-api-json'

type Body = { hodValidation: 'valid' | 'rejected' }

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  if (body.hodValidation !== 'valid' && body.hodValidation !== 'rejected') {
    return Response.json(
      { error: 'hodValidation must be "valid" or "rejected".' },
      { status: 400 }
    )
  }
  return tryRespondWithDbSetupHint(async () => {
    const store = await getHydroPaymentStore()
    const updated = store.setReadingValidation(id, body.hodValidation)
    if (!updated) {
      return Response.json({ error: 'Reading not found.' }, { status: 404 })
    }
    await commitHydroPaymentStore(store)
    return Response.json({ reading: readingToJson(updated) })
  })
}
