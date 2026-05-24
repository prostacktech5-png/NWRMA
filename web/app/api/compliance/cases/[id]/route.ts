import { z } from 'zod'
import { withComplianceApi } from '@/lib/lro-api-auth'
import {
  caseToJson,
  deleteComplianceCase,
  getComplianceCaseById,
  updateComplianceCase,
} from '@/lib/lro-store'
import type { ComplianceCaseStatus } from '@/lib/compliance-mock-data'
import type { EnforcementStage } from '@/lib/lro-store'

const PatchBody = z
  .object({
    entityName: z.string().min(1).optional(),
    violationType: z.string().min(1).optional(),
    workstream: z.string().optional(),
    planYear: z.string().optional(),
    status: z.enum(['open', 'in_review', 'resolved', 'escalated']).optional(),
    enforcementStage: z
      .enum(['none', 'notice', 'compliance_order', 'admin_penalty', 'prosecution'])
      .optional(),
    assignedOfficer: z.string().optional(),
    dueDate: z.string().nullable().optional(),
    notes: z.string().optional(),
    licenseReference: z.string().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field' })

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  return withComplianceApi(req, 'view', async () => {
    const row = await getComplianceCaseById(decodeURIComponent(id))
    if (!row) return Response.json({ error: 'Case not found' }, { status: 404 })
    return Response.json({ case: caseToJson(row) })
  })
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  return withComplianceApi(req, 'manage_cases', async (viewer) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const parsed = PatchBody.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.message }, { status: 400 })
    }
    if (parsed.data.enforcementStage && parsed.data.enforcementStage !== 'none') {
      const canEnforce = await import('@/lib/compliance-access-policy').then((m) =>
        m.canCompliance(viewer, 'enforce')
      )
      if (!canEnforce) {
        return Response.json({ error: 'Not allowed to set enforcement stage.' }, { status: 403 })
      }
    }
    const row = await updateComplianceCase(
      decodeURIComponent(id),
      {
        ...parsed.data,
        status: parsed.data.status as ComplianceCaseStatus | undefined,
        enforcementStage: parsed.data.enforcementStage as EnforcementStage | undefined,
      },
      viewer.id
    )
    if (!row) return Response.json({ error: 'Case not found' }, { status: 404 })
    return Response.json({ case: caseToJson(row) })
  })
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  return withComplianceApi(req, 'manage_cases', async (viewer) => {
    if (viewer.role !== 'hod' && !viewer.platformRoles.includes('super_admin')) {
      return Response.json({ error: 'Only Head of Department can delete cases.' }, { status: 403 })
    }
    const ok = await deleteComplianceCase(decodeURIComponent(id))
    if (!ok) return Response.json({ error: 'Case not found' }, { status: 404 })
    return Response.json({ ok: true })
  })
}
