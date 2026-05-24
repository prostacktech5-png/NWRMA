import { z } from 'zod'
import { tryRespondWithDbSetupHint } from '@/lib/db'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { commitFinanceApiStore, getFinanceApiStore } from '@/lib/finance-api-store'
import { canDecideFinanceRequisition } from '@/lib/finance-requisition-approval-policy'

const Params = z.object({ id: z.coerce.number().int().positive() })

const ApproveBody = z.object({
  action: z.enum(['approve', 'reject']),
  comment: z.string().optional().nullable(),
})

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = Params.safeParse(await ctx.params)
  if (!params.success) {
    return Response.json({ error: params.error.message }, { status: 400 })
  }
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsed = ApproveBody.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 })
  }

  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 })
    }

    const store = await getFinanceApiStore()
    const row = store.requisitions.find((r) => r.id === params.data.id)
    if (!row) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    if (!canDecideFinanceRequisition(viewer, row)) {
      return Response.json(
        {
          error:
            'You cannot act on this requisition at its current stage. Flow: HoD review first; for amounts above 500 SLE, HR & Admin approval, then DG, then Finance settlement; petty requests ≤500 SLE skip that chain and go straight to Finance after HoD.',
        },
        { status: 403 }
      )
    }

    const out = store.applyRequisitionDecision(params.data.id, { action: parsed.data.action })
    if (!out.ok) {
      return Response.json({ error: out.error }, { status: out.status })
    }
    await commitFinanceApiStore(store)
    return Response.json(out.row)
  })
}
