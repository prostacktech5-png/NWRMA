import { z } from 'zod'
import { withComplianceApi } from '@/lib/lro-api-auth'
import {
  deleteRegulation,
  getRegulationById,
  regulationToJson,
  updateRegulation,
} from '@/lib/lro-store'

const PatchBody = z
  .object({
    category: z.enum(['Acts', 'Regulations', 'Policies']).optional(),
    title: z.string().min(1).optional(),
    summary: z.string().optional(),
    externalUrl: z.string().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field' })

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  return withComplianceApi(req, 'view', async () => {
    const row = await getRegulationById(decodeURIComponent(id))
    if (!row) return Response.json({ error: 'Regulation not found' }, { status: 404 })
    return Response.json({ regulation: regulationToJson(row) })
  })
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  return withComplianceApi(req, 'manage_regulations', async (viewer) => {
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
    const row = await updateRegulation(decodeURIComponent(id), parsed.data, viewer.id)
    if (!row) return Response.json({ error: 'Regulation not found' }, { status: 404 })
    return Response.json({ regulation: regulationToJson(row) })
  })
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  return withComplianceApi(req, 'manage_regulations', async () => {
    const ok = await deleteRegulation(decodeURIComponent(id))
    if (!ok) return Response.json({ error: 'Regulation not found' }, { status: 404 })
    return Response.json({ ok: true })
  })
}
