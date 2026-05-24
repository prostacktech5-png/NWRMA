import { z } from 'zod'
import { withComplianceApi } from '@/lib/lro-api-auth'
import {
  createLegalMatter,
  listLegalMatters,
  matterToJson,
} from '@/lib/lro-store'

const CreateBody = z.object({
  title: z.string().min(1),
  matterType: z.enum(['byelaw', 'representation', 'advisory']),
  summary: z.string().optional(),
  licenseReference: z.string().nullable().optional(),
})

export async function GET(req: Request) {
  return withComplianceApi(req, 'view', async () => {
    const url = new URL(req.url)
    const matterType = url.searchParams.get('matterType') ?? undefined
    const search = url.searchParams.get('search') ?? undefined
    const matters = await listLegalMatters({ matterType, search })
    return Response.json({ matters: matters.map(matterToJson) })
  })
}

export async function POST(req: Request) {
  return withComplianceApi(req, 'manage_legal', async (viewer) => {
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
    const row = await createLegalMatter(parsed.data, viewer.id)
    return Response.json({ matter: matterToJson(row) }, { status: 201 })
  })
}
