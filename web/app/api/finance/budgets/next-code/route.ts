import { z } from 'zod'
import { generateUniqueBudgetCode, getFinanceApiStore } from '@/lib/finance-api-store'

const Query = z.object({
  department: z.string().min(1),
  fiscalYear: z.string().min(2),
})

/**
 * Returns the next auto-generated budget code for a department + fiscal year
 * (same algorithm as POST when budgetCode is omitted).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const parsed = Query.safeParse({
    department: searchParams.get('department') ?? '',
    fiscalYear: searchParams.get('fiscalYear') ?? '',
  })
  if (!parsed.success) {
    return Response.json(
      { error: 'department and fiscalYear query parameters are required' },
      { status: 400 }
    )
  }
  const department = parsed.data.department.trim()
  const fiscalYear = parsed.data.fiscalYear.trim()
  const store = await getFinanceApiStore()
  const code = generateUniqueBudgetCode(store, department, fiscalYear)
  return Response.json({ code })
}
