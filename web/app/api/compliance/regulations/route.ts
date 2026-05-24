import { z } from 'zod'
import { withComplianceApi } from '@/lib/lro-api-auth'
import {
  createRegulation,
  listRegulations,
  regulationToJson,
} from '@/lib/lro-store'

const CreateBody = z.object({
  category: z.enum(['Acts', 'Regulations', 'Policies']),
  title: z.string().min(1),
  summary: z.string().optional(),
  externalUrl: z.string().nullable().optional(),
})

export async function GET(req: Request) {
  return withComplianceApi(req, 'view', async () => {
    const url = new URL(req.url)
    const category = url.searchParams.get('category') ?? undefined
    const regulations = await listRegulations(category)
    return Response.json({ regulations: regulations.map(regulationToJson) })
  })
}

export async function POST(req: Request) {
  return withComplianceApi(req, 'manage_regulations', async (viewer) => {
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
    const row = await createRegulation(parsed.data, viewer.id)
    return Response.json({ regulation: regulationToJson(row) }, { status: 201 })
  })
}
