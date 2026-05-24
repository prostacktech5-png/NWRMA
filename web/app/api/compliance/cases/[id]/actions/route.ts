import { z } from 'zod'
import { withComplianceApi } from '@/lib/lro-api-auth'
import {
  caseToJson,
  getComplianceCaseById,
  updateComplianceCase,
  type EnforcementStage,
} from '@/lib/lro-store'

const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start_review') }),
  z.object({ action: z.literal('resolve') }),
  z.object({ action: z.literal('escalate') }),
  z.object({
    action: z.literal('set_enforcement'),
    enforcementStage: z.enum([
      'none',
      'notice',
      'compliance_order',
      'admin_penalty',
      'prosecution',
    ]),
  }),
])

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const caseId = decodeURIComponent(id)
  return withComplianceApi(req, 'manage_cases', async (viewer) => {
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

    const existing = await getComplianceCaseById(caseId)
    if (!existing) return Response.json({ error: 'Case not found' }, { status: 404 })

    const { action } = parsed.data
    if (action === 'set_enforcement') {
      const { canCompliance } = await import('@/lib/compliance-access-policy')
      if (!canCompliance(viewer, 'enforce')) {
        return Response.json({ error: 'Not allowed to set enforcement stage.' }, { status: 403 })
      }
      const row = await updateComplianceCase(
        caseId,
        {
          enforcementStage: parsed.data.enforcementStage as EnforcementStage,
          status: parsed.data.enforcementStage !== 'none' ? 'escalated' : existing.status,
        },
        viewer.id
      )
      return Response.json({ case: caseToJson(row!) })
    }

    if (action === 'start_review') {
      if (existing.status !== 'open') {
        return Response.json({ error: 'Only open cases can start review.' }, { status: 400 })
      }
      const row = await updateComplianceCase(caseId, { status: 'in_review' }, viewer.id)
      return Response.json({ case: caseToJson(row!) })
    }

    if (action === 'resolve') {
      const row = await updateComplianceCase(caseId, { status: 'resolved' }, viewer.id)
      return Response.json({ case: caseToJson(row!) })
    }

    if (action === 'escalate') {
      const row = await updateComplianceCase(caseId, { status: 'escalated' }, viewer.id)
      return Response.json({ case: caseToJson(row!) })
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 })
  })
}
