import { z } from 'zod'
import { withComplianceApi } from '@/lib/lro-api-auth'
import {
  campaignToJson,
  createCampaign,
  listCampaigns,
} from '@/lib/lro-store'

const CreateBody = z.object({
  title: z.string().min(1),
  channel: z.string().min(1),
  theme: z.enum(['awareness', 'image', 'regularisation', 'crisis']),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  notes: z.string().optional(),
})

export async function GET(req: Request) {
  return withComplianceApi(req, 'view', async () => {
    const url = new URL(req.url)
    const theme = url.searchParams.get('theme') as
      | 'awareness'
      | 'image'
      | 'regularisation'
      | 'crisis'
      | null
    const search = url.searchParams.get('search') ?? undefined
    const campaigns = await listCampaigns({
      theme: theme ?? undefined,
      search,
    })
    return Response.json({ campaigns: campaigns.map(campaignToJson) })
  })
}

export async function POST(req: Request) {
  return withComplianceApi(req, 'manage_comms', async (viewer) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const parsed = CreateBody.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.message }, { status: 400 })
    }
    const row = await createCampaign(parsed.data, viewer.id)
    return Response.json({ campaign: campaignToJson(row) }, { status: 201 })
  })
}
