import { z } from 'zod'
import {
  commitFinanceApiStore,
  generateUniqueBudgetCode,
  getFinanceApiStore,
  normalizeBudgetCode,
  parseBudgetJson,
} from '@/lib/finance-api-store'

const CreateBudgetBody = z.object({
  /** Omit or leave empty to assign BUD-{DEPT}-{FY}-{SEQ} automatically. */
  budgetCode: z.union([z.string(), z.null()]).optional(),
  department: z.string().min(1),
  project: z.string().min(1),
  source: z.enum(['donor', 'local']),
  totalAmount: z.number().positive(),
  fiscalYear: z.string().min(2),
})

export async function GET() {
  const store = await getFinanceApiStore()
  const list = [...store.budgets].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  )
  return Response.json(list.map(parseBudgetJson))
}

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsed = CreateBudgetBody.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 })
  }
  const store = await getFinanceApiStore()
  const dept = parsed.data.department.trim()
  const fy = parsed.data.fiscalYear.trim()
  const rawCode =
    parsed.data.budgetCode === null || parsed.data.budgetCode === undefined ?
      ''
    : String(parsed.data.budgetCode).trim()
  const code =
    rawCode.length > 0 ?
      normalizeBudgetCode(rawCode)
    : generateUniqueBudgetCode(store, dept, fy)
  if (rawCode.length > 0 && code.length < 2) {
    return Response.json({ error: 'budgetCode must be at least 2 characters' }, { status: 400 })
  }
  if (store.budgets.some((b) => b.budgetCode === code)) {
    return Response.json({ error: `Budget code "${code}" is already in use` }, { status: 400 })
  }
  const now = new Date()
  const budget = {
    id: store.nextBudgetId++,
    budgetCode: code,
    department: dept,
    project: parsed.data.project.trim(),
    source: parsed.data.source,
    totalAmount: parsed.data.totalAmount,
    utilizedAmount: 0,
    fiscalYear: fy,
    createdAt: now,
  }
  store.budgets.push(budget)
  await commitFinanceApiStore(store)
  return Response.json(parseBudgetJson(budget), { status: 201 })
}
