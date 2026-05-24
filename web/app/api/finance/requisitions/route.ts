import { z } from 'zod'
import {
  commitFinanceApiStore,
  getFinanceApiStore,
  parseRequisitionJson,
} from '@/lib/finance-api-store'
import { resolveFinanceRequisitionRoute } from '@/lib/finance-requisition-routing'
import { financeBudgetDepartmentMatches } from '@/lib/orgDepartments'

const ListQuery = z.object({
  status: z.string().optional(),
  department: z.string().optional(),
})

const CreateBody = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  requestedBy: z.string().min(1),
  requesterEmail: z.union([z.string().email(), z.literal(''), z.null()]).optional(),
  department: z.string().min(1),
  amount: z.number().positive(),
  budgetId: z.coerce.number().int().positive(),
  expenseKind: z.string().optional(),
})

const EXPENSE_KINDS = new Set(['general', 'petty_cash', 'per_diem'])

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const parsed = ListQuery.safeParse({
    status: searchParams.get('status') ?? undefined,
    department: searchParams.get('department') ?? undefined,
  })
  const status = parsed.success ? parsed.data.status : undefined
  const department = parsed.success ? parsed.data.department : undefined
  const store = await getFinanceApiStore()
  const rows = store.requisitions.filter((r) => {
    if (status && r.status !== status) return false
    if (department && !financeBudgetDepartmentMatches(r.department, department)) return false
    return true
  })
  rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  return Response.json(rows.map(parseRequisitionJson))
}

export async function POST(req: Request) {
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

  const store = await getFinanceApiStore()
  const snap = store.getBudgetLiquidityForNewRequest(parsed.data.budgetId)
  if (!snap.ok) {
    return Response.json({ error: snap.error }, { status: 400 })
  }

  if (!store.passesFundsGateForHodSubmission(snap.liquidity, parsed.data.amount)) {
    return Response.json(
      {
        error:
          'Insufficient budget funds — the request was not submitted. Available balance is reduced by amounts already in the approval pipeline. The requester is notified by email when an address is available.',
        code: 'INSUFFICIENT_FUNDS',
      },
      { status: 400 }
    )
  }

  const rawKind = parsed.data.expenseKind && typeof parsed.data.expenseKind === 'string' ? parsed.data.expenseKind : 'general'
  const route = resolveFinanceRequisitionRoute(parsed.data.amount)
  const expenseKind =
    route === 'petty_cash_direct' ? 'petty_cash' : EXPENSE_KINDS.has(rawKind) ? rawKind : 'general'
  const emailRaw =
    parsed.data.requesterEmail === null || parsed.data.requesterEmail === undefined ?
      ''
    : String(parsed.data.requesterEmail).trim()
  const requesterEmail = emailRaw.length > 0 ? emailRaw : null

  const row = store.createRequisition({
    title: parsed.data.title,
    description: parsed.data.description,
    requestedBy: parsed.data.requestedBy,
    requesterEmail,
    department: parsed.data.department,
    amount: parsed.data.amount,
    budgetId: parsed.data.budgetId,
    expenseKind,
  })

  await commitFinanceApiStore(store)

  return Response.json(parseRequisitionJson(row), { status: 201 })
}
