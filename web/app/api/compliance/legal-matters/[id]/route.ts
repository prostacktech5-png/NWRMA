import { z } from 'zod'
import { withComplianceApi } from '@/lib/lro-api-auth'
import {
  getLegalMatterById,
  matterToJson,
  updateLegalMatter,
} from '@/lib/lro-store'

const PatchBody = z
  .object({
    title: z.string().min(1).optional(),
    matterType: z.enum(['byelaw', 'representation', 'advisory']).optional(),
    status: z.enum(['draft', 'active', 'archived']).optional(),
    summary: z.string().optional(),
    licenseReference: z.string().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field' })

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  return withComplianceApi(req, 'view', async () => {
    const row = await getLegalMatterById(decodeURIComponent(id))
    if (!row) return Response.json({ error: 'Matter not found' }, { status: 404 })
    return Response.json({ matter: matterToJson(row) })
  })
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  return withComplianceApi(req, 'manage_legal', async (viewer) => {
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
    const row = await updateLegalMatter(decodeURIComponent(id), parsed.data, viewer.id)
    if (!row) return Response.json({ error: 'Matter not found' }, { status: 404 })
    return Response.json({ matter: matterToJson(row) })
  })
}
