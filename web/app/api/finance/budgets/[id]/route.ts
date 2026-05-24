import { z } from 'zod'
import {
  commitFinanceApiStore,
  getFinanceApiStore,
  normalizeBudgetCode,
  parseBudgetJson,
} from '@/lib/finance-api-store'

const BudgetIdParams = z.object({ id: z.coerce.number().int().positive() })

const UpdateBudgetBody = z
  .object({
    budgetCode: z.string().min(2).optional(),
    department: z.string().min(1).optional(),
    project: z.string().min(1).optional(),
    source: z.enum(['donor', 'local']).optional(),
    totalAmount: z.number().positive().optional(),
    fiscalYear: z.string().min(2).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'Provide at least one field to update',
  })

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = BudgetIdParams.safeParse(await ctx.params)
  if (!params.success) {
    return Response.json({ error: params.error.message }, { status: 400 })
  }
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const bodyParsed = UpdateBudgetBody.safeParse(body)
  if (!bodyParsed.success) {
    return Response.json({ error: bodyParsed.error.message }, { status: 400 })
  }

  const store = await getFinanceApiStore()
  const existing = store.budgets.find((b) => b.id === params.data.id)
  if (!existing) {
    return Response.json({ error: 'Budget not found' }, { status: 404 })
  }

  const nextCodeRaw = bodyParsed.data.budgetCode
  const nextCode = nextCodeRaw ? normalizeBudgetCode(nextCodeRaw) : undefined
  if (nextCode) {
    const clash = store.budgets.some(
      (b) => b.budgetCode === nextCode && b.id !== params.data.id
    )
    if (clash) {
      return Response.json({ error: `Budget code "${nextCode}" is already in use` }, { status: 400 })
    }
  }

  const nextTotalAmount = bodyParsed.data.totalAmount
  if (
    typeof nextTotalAmount === 'number' &&
    nextTotalAmount < existing.utilizedAmount
  ) {
    return Response.json(
      {
        error: `totalAmount cannot be less than already utilized amount (${existing.utilizedAmount})`,
      },
      { status: 400 }
    )
  }

  const nextDepartment = bodyParsed.data.department?.trim()
  const nextProject = bodyParsed.data.project?.trim() ?? nextDepartment

  if (nextCode !== undefined) existing.budgetCode = nextCode
  if (nextDepartment !== undefined) existing.department = nextDepartment
  if (nextProject !== undefined) existing.project = nextProject
  if (bodyParsed.data.source !== undefined) existing.source = bodyParsed.data.source
  if (typeof nextTotalAmount === 'number') existing.totalAmount = nextTotalAmount
  if (bodyParsed.data.fiscalYear !== undefined) {
    existing.fiscalYear = bodyParsed.data.fiscalYear.trim()
  }

  await commitFinanceApiStore(store)
  return Response.json(parseBudgetJson(existing))
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = BudgetIdParams.safeParse(await ctx.params)
  if (!params.success) {
    return Response.json({ error: params.error.message }, { status: 400 })
  }
  const store = await getFinanceApiStore()
  const existing = store.budgets.find((b) => b.id === params.data.id)
  if (!existing) {
    return Response.json({ error: 'Budget not found' }, { status: 404 })
  }
  if (existing.utilizedAmount > 0) {
    return Response.json(
      { error: 'Cannot delete a budget line that has utilized amount' },
      { status: 400 }
    )
  }
  const linked = store.requisitions.some((r) => r.budgetId === params.data.id)
  if (linked) {
    return Response.json(
      { error: 'Cannot delete a budget line linked to requisitions' },
      { status: 400 }
    )
  }
  store.budgets = store.budgets.filter((b) => b.id !== params.data.id)
  await commitFinanceApiStore(store)
  return new Response(null, { status: 204 })
}