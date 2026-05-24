import { z } from 'zod'
import { getFinanceApiStore, parseRequisitionJson } from '@/lib/finance-api-store'

const Params = z.object({ id: z.coerce.number().int().positive() })

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = Params.safeParse(await ctx.params)
  if (!params.success) {
    return Response.json({ error: params.error.message }, { status: 400 })
  }
  const store = await getFinanceApiStore()
  const row = store.requisitions.find((r) => r.id === params.data.id)
  if (!row) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  return Response.json(parseRequisitionJson(row))
}
