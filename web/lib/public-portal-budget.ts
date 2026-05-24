import {
  filterFinanceBudgetsForDepartment,
  getFinanceApiStore,
  type FinanceApiStore,
} from '@/lib/finance-api-store'
import type { HydroPublicProgrammeBudgetInfo } from '@/lib/hydro-public-portals-stub'
import { departmentNames } from '@/lib/erp-formatting'
import { VALID_DEPTS, type CanonicalDept, toCanonicalDept } from '@/lib/orgDepartments'

export type PublicFormDepartment = {
  id: CanonicalDept
  label: string
}

export type PublicFormBudgetLine = HydroPublicProgrammeBudgetInfo

export function listDepartmentsForPublicForm(): PublicFormDepartment[] {
  return VALID_DEPTS.map((id) => ({
    id,
    label: departmentNames[id] ?? id,
  }))
}

export function mapBudgetLinesFromStore(
  store: FinanceApiStore,
  dept: CanonicalDept,
): PublicFormBudgetLine[] {
  const lines = filterFinanceBudgetsForDepartment(store.budgets, dept)
  return lines.map((b) => {
    const pending = store.pendingPipelineForBudget(b.id)
    const availableBalance = b.totalAmount - b.utilizedAmount
    return {
      code: b.budgetCode,
      budgetId: b.id,
      label: `${b.budgetCode} — ${b.project}`,
      project: b.project,
      fiscalYear: b.fiscalYear,
      availableBalance,
      pendingCommittedInApprovalPipeline: pending,
    }
  })
}

export async function listBudgetLinesForDepartment(
  dept: CanonicalDept,
): Promise<PublicFormBudgetLine[]> {
  const store = await getFinanceApiStore()
  return mapBudgetLinesFromStore(store, dept)
}

export async function buildPublicFormBudgetPayload(
  departmentsFilter?: CanonicalDept[],
): Promise<{
  departments: PublicFormDepartment[]
  budgetLinesByDepartment: Record<CanonicalDept, PublicFormBudgetLine[]>
}> {
  const departments = listDepartmentsForPublicForm()
  const store = await getFinanceApiStore()
  const depts = departmentsFilter ?? [...VALID_DEPTS]
  const budgetLinesByDepartment = {} as Record<CanonicalDept, PublicFormBudgetLine[]>
  for (const dept of depts) {
    budgetLinesByDepartment[dept] = mapBudgetLinesFromStore(store, dept)
  }
  return { departments, budgetLinesByDepartment }
}

export async function resolveProgrammeBudget(
  departmentRaw: string,
  budgetCodeRaw: string,
): Promise<{ ok: true; programme: PublicFormBudgetLine } | { ok: false; error: string }> {
  const dept = toCanonicalDept(departmentRaw)
  if (!dept) {
    return { ok: false, error: 'Invalid department.' }
  }
  const budgetCode = budgetCodeRaw.trim()
  if (!budgetCode) {
    return { ok: false, error: 'Budget code is required.' }
  }
  const lines = await listBudgetLinesForDepartment(dept)
  const programme = lines.find((l) => l.code === budgetCode)
  if (!programme) {
    return { ok: false, error: 'Budget code does not match the selected department.' }
  }
  return { ok: true, programme }
}

export async function validatePortalSubmissionAmount(
  departmentRaw: string,
  budgetCode: string,
  amount: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const resolved = await resolveProgrammeBudget(departmentRaw, budgetCode)
  if (!resolved.ok) return resolved
  const { programme } = resolved
  const committed = programme.pendingCommittedInApprovalPipeline ?? 0
  const remaining = programme.availableBalance - committed
  if (amount > remaining) {
    return {
      ok: false,
      error: 'Request total exceeds remaining budget available for new submissions.',
    }
  }
  return { ok: true }
}
