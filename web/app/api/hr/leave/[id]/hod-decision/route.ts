import { z } from 'zod'
import { tryRespondWithDbSetupHint } from '@/lib/db'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { applyHrHeadLeaveDecision } from '@/lib/dg-leave-store'
import { canHrHeadDecideLeave } from '@/lib/leave-approval-policy'

const Body = z.object({
  action: z.enum(['approve', 'reject']),
})

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsed = Body.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 })
  }
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 })
    }
    if (!canHrHeadDecideLeave(viewer)) {
      return Response.json(
        { error: 'Only the Human Resources Head of Department (or administrator) acts at this leave stage.' },
        { status: 403 }
      )
    }
    const out = await applyHrHeadLeaveDecision(decodeURIComponent(id), parsed.data)
    if (!out.ok) {
      return Response.json({ error: out.error }, { status: out.status })
    }
    return Response.json({ ok: true as const, leave: out.row })
  })
}
