import { z } from 'zod'
import { withComplianceApi } from '@/lib/lro-api-auth'
import {
  campaignToJson,
  getCampaignById,
  updateCampaign,
} from '@/lib/lro-store'

const PatchBody = z
  .object({
    title: z.string().min(1).optional(),
    channel: z.string().optional(),
    theme: z.enum(['awareness', 'image', 'regularisation', 'crisis']).optional(),
    status: z.enum(['planned', 'active', 'completed']).optional(),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    notes: z.string().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field' })

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  return withComplianceApi(req, 'view', async () => {
    const row = await getCampaignById(decodeURIComponent(id))
    if (!row) return Response.json({ error: 'Campaign not found' }, { status: 404 })
    return Response.json({ campaign: campaignToJson(row) })
  })
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  return withComplianceApi(req, 'manage_comms', async (viewer) => {
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
    const row = await updateCampaign(decodeURIComponent(id), parsed.data, viewer.id)
    if (!row) return Response.json({ error: 'Campaign not found' }, { status: 404 })
    return Response.json({ campaign: campaignToJson(row) })
  })
}
