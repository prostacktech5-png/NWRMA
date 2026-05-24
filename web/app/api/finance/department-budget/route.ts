import { z } from 'zod'
import { buildDepartmentBudgetOverviewFromStore } from '@/lib/finance-api-store'

const Query = z.object({
  department: z.string().min(1),
})

/**
 * Programme budget lines for a department from the finance DB (same source as Finance → Budgets).
 * Query: `?department=hydrological` | `boreholes` | `financial` | `hr` | `other` (legacy `water_quality` normalizes to hydrological)
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const parsed = Query.safeParse({ department: searchParams.get('department') ?? '' })
  if (!parsed.success) {
    return Response.json({ error: 'department query parameter is required' }, { status: 400 })
  }
  const payload = await buildDepartmentBudgetOverviewFromStore(parsed.data.department)
  return Response.json(payload)
}
