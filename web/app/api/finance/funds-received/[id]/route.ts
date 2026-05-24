import { z } from 'zod'
import { commitFinanceApiStore, getFinanceApiStore } from '@/lib/finance-api-store'

const Params = z.object({ id: z.coerce.number().int().positive() })

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = Params.safeParse(await ctx.params)
  if (!params.success) {
    return Response.json({ error: params.error.message }, { status: 400 })
  }
  const store = await getFinanceApiStore()
  const before = store.receipts.length
  store.receipts = store.receipts.filter((r) => r.id !== params.data.id)
  if (store.receipts.length === before) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  await commitFinanceApiStore(store)
  return new Response(null, { status: 204 })
}
