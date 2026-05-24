import { buildHydrologicalBudgetOverviewFromStore } from '@/lib/finance-api-store'

export async function GET() {
  return Response.json(await buildHydrologicalBudgetOverviewFromStore())
}
