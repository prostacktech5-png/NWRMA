import { z } from 'zod'
import { withComplianceApi } from '@/lib/lro-api-auth'
import {
  getLegalMatterById,
  matterToJson,
  updateLegalMatter,
} from '@/lib/lro-store'

const Body = z.object({
  action: z.enum(['activate', 'archive']),
})

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const matterId = decodeURIComponent(id)
  return withComplianceApi(req, 'manage_legal', async (viewer) => {
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

    const existing = await getLegalMatterById(matterId)
    if (!existing) return Response.json({ error: 'Matter not found' }, { status: 404 })

    if (parsed.data.action === 'activate') {
      if (existing.status !== 'draft') {
        return Response.json({ error: 'Only draft matters can be activated.' }, { status: 400 })
      }
      const row = await updateLegalMatter(matterId, { status: 'active' }, viewer.id)
      return Response.json({ matter: matterToJson(row!) })
    }

    const row = await updateLegalMatter(matterId, { status: 'archived' }, viewer.id)
    return Response.json({ matter: matterToJson(row!) })
  })
}
