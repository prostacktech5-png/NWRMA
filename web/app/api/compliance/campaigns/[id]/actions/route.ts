import { z } from 'zod'
import { withComplianceApi } from '@/lib/lro-api-auth'
import {
  campaignToJson,
  getCampaignById,
  updateCampaign,
} from '@/lib/lro-store'

const Body = z.object({
  action: z.enum(['launch', 'complete']),
})

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const campaignId = decodeURIComponent(id)
  return withComplianceApi(req, 'manage_comms', async (viewer) => {
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

    const existing = await getCampaignById(campaignId)
    if (!existing) return Response.json({ error: 'Campaign not found' }, { status: 404 })

    if (parsed.data.action === 'launch') {
      if (existing.status !== 'planned') {
        return Response.json({ error: 'Only planned campaigns can be launched.' }, { status: 400 })
      }
      const row = await updateCampaign(
        campaignId,
        {
          status: 'active',
          startDate: existing.startDate ?? new Date().toISOString().slice(0, 10),
        },
        viewer.id
      )
      return Response.json({ campaign: campaignToJson(row!) })
    }

    const row = await updateCampaign(
      campaignId,
      {
        status: 'completed',
        endDate: new Date().toISOString().slice(0, 10),
      },
      viewer.id
    )
    return Response.json({ campaign: campaignToJson(row!) })
  })
}
