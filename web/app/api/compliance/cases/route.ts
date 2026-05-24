import { z } from 'zod'
import { withComplianceApi } from '@/lib/lro-api-auth'
import {
  caseToJson,
  createComplianceCase,
  listComplianceCases,
} from '@/lib/lro-store'

const CreateBody = z.object({
  entityName: z.string().min(1),
  violationType: z.string().min(1),
  workstream: z.string().optional(),
  planYear: z.string().optional(),
  assignedOfficer: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  notes: z.string().optional(),
  licenseReference: z.string().nullable().optional(),
})

export async function GET(req: Request) {
  return withComplianceApi(req, 'view', async () => {
    const url = new URL(req.url)
    const search = url.searchParams.get('search') ?? undefined
    const cases = await listComplianceCases(search)
    return Response.json({ cases: cases.map(caseToJson) })
  })
}

export async function POST(req: Request) {
  return withComplianceApi(req, 'manage_cases', async (viewer) => {
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
    const row = await createComplianceCase(parsed.data, viewer.id)
    return Response.json({ case: caseToJson(row) }, { status: 201 })
  })
}
