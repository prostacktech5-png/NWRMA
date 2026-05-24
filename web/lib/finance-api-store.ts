import { getSql } from '@/lib/db'
import { createDefaultErpReferencePayload } from '@/lib/erp-reference-defaults'
import {
  resolveFinanceRequisitionRoute,
  usesPettyCashDirectRouting,
} from '@/lib/finance-requisition-routing'
import { normalizeFinanceDepartmentField } from '@/lib/hydrological-services-merge'
import { financeBudgetDepartmentMatches } from '@/lib/orgDepartments'

export type FinanceSource = 'donor' | 'local'

export type FinanceBudget = {
  id: number
  budgetCode: string
  department: string
  project: string
  source: FinanceSource
  totalAmount: number
  utilizedAmount: number
  fiscalYear: string
  createdAt: Date
}

export type FundsReceiptRow = {
  id: number
  fiscalYear: string
  amount: number
  reference: string | null
  notes: string | null
  source: string
  recordedAt: Date
}

export type FinanceRequisitionRow = {
  id: number
  title: string
  description: string
  requestedBy: string
  requesterEmail: string | null
  department: string
  amount: number
  budgetId: number
  expenseKind: string
  status: string
  approvalRoute: string | null
  createdAt: Date
  updatedAt: Date
}

export function filterFinanceBudgetsForDepartment(
  budgets: FinanceBudget[],
  departmentKey: string
): FinanceBudget[] {
  return budgets.filter((b) => financeBudgetDepartmentMatches(b.department, departmentKey))
}

const PENDING_PIPELINE = new Set([
  'hod_review',
  'admin_review',
  'dg_review',
  'finance_review',
])

export function normalizeBudgetCode(raw: string): string {
  return raw.trim().replace(/\s+/g, '-').toUpperCase()
}

export function normalizeFiscalYearKey(raw: string): string {
  return raw.trim().replace(/\s*\/\s*/g, '/').replace(/\s+/g, '')
}

export function fiscalYearMatches(a: string, b: string): boolean {
  return normalizeFiscalYearKey(a) === normalizeFiscalYearKey(b)
}

/** Canonical department key → segment used in auto-generated budget codes (BUD-{SEG}-{FY}-{SEQ}). */
export const DEPARTMENT_BUDGET_CODE_PREFIX: Record<string, string> = {
  hydrological: 'HYD',
  boreholes: 'BOR',
  financial: 'FIN',
  hr: 'HR',
  compliance: 'CMP',
  other: 'OTH',
}

/** Compact FY fragment for codes, e.g. 2024/25 → 2425 */
export function fiscalYearSegmentForBudgetCode(fiscalYear: string): string {
  const key = normalizeFiscalYearKey(fiscalYear)
  const m = key.match(/^(\d{4})\/(\d{2,4})$/)
  if (m) {
    const y1 = m[1]
    const y2 = m[2]
    const y2short = y2.length >= 2 ? y2.slice(-2) : y2.padStart(2, '0')
    return `${y1.slice(2)}${y2short}`
  }
  const alnum = normalizeBudgetCode(key).replace(/[^A-Z0-9]/g, '')
  return (alnum.length > 0 ? alnum : 'FY').slice(0, 8)
}

/**
 * Next unique programme budget code for a department and fiscal year.
 * Format: BUD-{DEPT}-{FY}-{SEQ} (e.g. BUD-HYD-2425-0001).
 */
export function generateUniqueBudgetCode(
  store: { budgets: FinanceBudget[] },
  department: string,
  fiscalYear: string
): string {
  const deptKey = department.trim().toLowerCase()
  const prefix = DEPARTMENT_BUDGET_CODE_PREFIX[deptKey] ?? 'GEN'
  const fySeg = fiscalYearSegmentForBudgetCode(fiscalYear)
  const re = new RegExp(`^BUD-${prefix}-${fySeg}-(\\d{4})$`)
  let max = 0
  for (const b of store.budgets) {
    const m = b.budgetCode.match(re)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  let seq = max + 1
  let code = `BUD-${prefix}-${fySeg}-${String(seq).padStart(4, '0')}`
  while (store.budgets.some((b) => b.budgetCode === code)) {
    seq += 1
    code = `BUD-${prefix}-${fySeg}-${String(seq).padStart(4, '0')}`
  }
  return code
}

export function parseBudgetJson(b: FinanceBudget) {
  return {
    id: b.id,
    budgetCode: b.budgetCode,
    department: b.department,
    project: b.project,
    source: b.source,
    totalAmount: b.totalAmount,
    utilizedAmount: b.utilizedAmount,
    availableBalance: b.totalAmount - b.utilizedAmount,
    fiscalYear: b.fiscalYear,
    createdAt: b.createdAt.toISOString(),
  }
}

export function parseFundsReceiptJson(row: FundsReceiptRow) {
  return {
    id: row.id,
    fiscalYear: row.fiscalYear,
    amount: row.amount,
    reference: row.reference,
    notes: row.notes,
    source: row.source,
    recordedAt: row.recordedAt.toISOString(),
  }
}

export function parseRequisitionJson(row: FinanceRequisitionRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    requestedBy: row.requestedBy,
    requesterEmail: row.requesterEmail,
    department: row.department,
    amount: row.amount,
    budgetId: row.budgetId,
    expenseKind: row.expenseKind,
    status: row.status,
    approvalRoute: row.approvalRoute,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export class FinanceApiStore {
  budgets: FinanceBudget[]
  receipts: FundsReceiptRow[]
  requisitions: FinanceRequisitionRow[]
  nextBudgetId: number
  nextReceiptId: number
  nextReqId: number

  private constructor(
    budgets: FinanceBudget[],
    receipts: FundsReceiptRow[],
    requisitions: FinanceRequisitionRow[],
    nextBudgetId: number,
    nextReceiptId: number,
    nextReqId: number
  ) {
    this.budgets = budgets
    this.receipts = receipts
    this.requisitions = requisitions
    this.nextBudgetId = nextBudgetId
    this.nextReceiptId = nextReceiptId
    this.nextReqId = nextReqId
  }

  static createFresh(): FinanceApiStore {
    const now = new Date()
    const budgets: FinanceBudget[] = []
    let nid = 1
    const budgetLines = createDefaultErpReferencePayload().programmeBudgetLines
    for (let i = 0; i < budgetLines.length; i++) {
      const bl = budgetLines[i]
      if (bl.fiscalYearId !== 'fy-2024') continue
      budgets.push({
        id: nid++,
        budgetCode: bl.programmeCode,
        department: bl.department ?? '',
        project: bl.programmeName,
        source: i % 2 === 0 ? 'local' : 'donor',
        totalAmount: bl.allocatedAmount,
        utilizedAmount: bl.utilizedAmount,
        fiscalYear: '2024/25',
        createdAt: now,
      })
    }
    return new FinanceApiStore(budgets, [], [], nid, 1, 1)
  }

  static async loadFromDatabase(): Promise<FinanceApiStore> {
    const sql = getSql()
    const bRows = (await sql`SELECT * FROM finance_budgets ORDER BY id`) as Record<string, unknown>[]
    const budgets: FinanceBudget[] = bRows.map((r) => ({
      id: Number(r.id),
      budgetCode: String(r.budget_code),
      department: normalizeFinanceDepartmentField(String(r.department)),
      project: String(r.project),
      source: String(r.source) === 'donor' ? 'donor' : 'local',
      totalAmount: Number(r.total_amount),
      utilizedAmount: Number(r.utilized_amount),
      fiscalYear: String(r.fiscal_year),
      createdAt: new Date(String(r.created_at)),
    }))
    const rcRows = (await sql`SELECT * FROM finance_funds_receipts ORDER BY id`) as Record<
      string,
      unknown
    >[]
    const receipts: FundsReceiptRow[] = rcRows.map((r) => ({
      id: Number(r.id),
      fiscalYear: String(r.fiscal_year),
      amount: Number(r.amount),
      reference: r.reference != null ? String(r.reference) : null,
      notes: r.notes != null ? String(r.notes) : null,
      source: String(r.source),
      recordedAt: new Date(String(r.recorded_at)),
    }))
    const qRows = (await sql`SELECT * FROM finance_requisitions ORDER BY id`) as Record<string, unknown>[]
    const requisitions: FinanceRequisitionRow[] = qRows.map((r) => ({
      id: Number(r.id),
      title: String(r.title),
      description: String(r.description),
      requestedBy: String(r.requested_by),
      requesterEmail: r.requester_email != null ? String(r.requester_email) : null,
      department: normalizeFinanceDepartmentField(String(r.department)),
      amount: Number(r.amount),
      budgetId: Number(r.budget_id),
      expenseKind: String(r.expense_kind),
      status: String(r.status),
      approvalRoute: r.approval_route != null ? String(r.approval_route) : null,
      createdAt: new Date(String(r.created_at)),
      updatedAt: new Date(String(r.updated_at)),
    }))
    const nextBudgetId = budgets.length ? Math.max(...budgets.map((b) => b.id)) + 1 : 1
    const nextReceiptId = receipts.length ? Math.max(...receipts.map((x) => x.id)) + 1 : 1
    const nextReqId = requisitions.length ? Math.max(...requisitions.map((x) => x.id)) + 1 : 1
    return new FinanceApiStore(budgets, receipts, requisitions, nextBudgetId, nextReceiptId, nextReqId)
  }

  async saveToDatabase(): Promise<void> {
    const sql = getSql()
    await sql`DELETE FROM finance_requisitions`
    await sql`DELETE FROM finance_funds_receipts`
    await sql`DELETE FROM finance_budgets`
    for (const b of this.budgets) {
      await sql`
        INSERT INTO finance_budgets (id, budget_code, department, project, source, total_amount, utilized_amount, fiscal_year, created_at)
        VALUES (
          ${b.id},
          ${b.budgetCode},
          ${b.department},
          ${b.project},
          ${b.source},
          ${b.totalAmount},
          ${b.utilizedAmount},
          ${b.fiscalYear},
          ${b.createdAt.toISOString()}
        )
      `
    }
    for (const f of this.receipts) {
      await sql`
        INSERT INTO finance_funds_receipts (id, fiscal_year, amount, reference, notes, source, recorded_at)
        VALUES (
          ${f.id},
          ${f.fiscalYear},
          ${f.amount},
          ${f.reference},
          ${f.notes},
          ${f.source},
          ${f.recordedAt.toISOString()}
        )
      `
    }
    for (const q of this.requisitions) {
      await sql`
        INSERT INTO finance_requisitions (
          id, title, description, requested_by, requester_email, department, amount, budget_id,
          expense_kind, status, approval_route, created_at, updated_at
        ) VALUES (
          ${q.id},
          ${q.title},
          ${q.description},
          ${q.requestedBy},
          ${q.requesterEmail},
          ${q.department},
          ${q.amount},
          ${q.budgetId},
          ${q.expenseKind},
          ${q.status},
          ${q.approvalRoute},
          ${q.createdAt.toISOString()},
          ${q.updatedAt.toISOString()}
        )
      `
    }
  }

  findBudget(id: number): FinanceBudget | undefined {
    return this.budgets.find((b) => b.id === id)
  }

  /**
   * Increases utilized amount on the first matching departmental budget with enough available balance.
   * Returns a rollback closure if the caller must revert (e.g. hydro disburse fails after this succeeds).
   */
  tryApplyUtilizationForDepartment(
    departmentKey: string,
    amount: number
  ): { ok: true; rollback: () => void } | { ok: false; error: string } {
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, error: 'Utilization amount must be a positive number.' }
    }
    const candidates = filterFinanceBudgetsForDepartment(this.budgets, departmentKey)
      .filter((b) => b.totalAmount - b.utilizedAmount >= amount)
      .slice()
      .sort((a, b) => a.id - b.id)
    const budget = candidates[0]
    if (!budget) {
      return {
        ok: false,
        error:
          'No programme budget line for this department has enough available balance to record this disbursement. Add allocation in Finance → Budgets or pick another line.',
      }
    }
    const previous = budget.utilizedAmount
    budget.utilizedAmount += amount
    return {
      ok: true,
      rollback: () => {
        budget.utilizedAmount = previous
      },
    }
  }

  pendingPipelineForBudget(budgetId: number): number {
    return this.requisitions
      .filter((r) => r.budgetId === budgetId && PENDING_PIPELINE.has(r.status))
      .reduce((s, r) => s + r.amount, 0)
  }

  getBudgetLiquidityForNewRequest(budgetId: number):
    | { ok: true; budget: FinanceBudget; liquidity: number; pendingPipeline: number }
    | { ok: false; error: string } {
    const budget = this.findBudget(budgetId)
    if (!budget) return { ok: false, error: 'Budget not found' }
    const pendingPipeline = this.pendingPipelineForBudget(budgetId)
    const liquidity = budget.totalAmount - budget.utilizedAmount - pendingPipeline
    return { ok: true, budget, liquidity, pendingPipeline }
  }

  passesFundsGateForHodSubmission(liquidity: number, amount: number): boolean {
    return liquidity >= amount
  }

  createRequisition(input: {
    title: string
    description: string
    requestedBy: string
    requesterEmail: string | null
    department: string
    amount: number
    budgetId: number
    expenseKind: string
  }): FinanceRequisitionRow {
    const now = new Date()
    const route = resolveFinanceRequisitionRoute(input.amount)
    const row: FinanceRequisitionRow = {
      id: this.nextReqId++,
      title: input.title,
      description: input.description,
      requestedBy: input.requestedBy,
      requesterEmail: input.requesterEmail,
      department: input.department,
      amount: input.amount,
      budgetId: input.budgetId,
      expenseKind: route === 'petty_cash_direct' ? 'petty_cash' : input.expenseKind,
      status: 'hod_review',
      approvalRoute: route,
      createdAt: now,
      updatedAt: now,
    }
    this.requisitions.unshift(row)
    return row
  }

  applyRequisitionDecision(
    id: number,
    input: { action: 'approve' | 'reject' }
  ): { ok: true; row: ReturnType<typeof parseRequisitionJson> } | { ok: false; status: number; error: string } {
    const row = this.requisitions.find((r) => r.id === id)
    if (!row) return { ok: false, status: 404, error: 'Not found' }
    if (row.status === 'approved' || row.status === 'rejected') {
      return { ok: false, status: 400, error: 'Requisition is already final' }
    }
    const now = new Date()
    if (input.action === 'reject') {
      row.status = 'rejected'
      row.updatedAt = now
      return { ok: true, row: parseRequisitionJson(row) }
    }
    const pettyDirect = usesPettyCashDirectRouting(row)
    if (row.status === 'hod_review') {
      row.status =
        pettyDirect ? 'finance_review' : 'admin_review'
      if (pettyDirect) {
        row.expenseKind = 'petty_cash'
        row.approvalRoute = 'petty_cash_direct'
      }
    } else if (row.status === 'admin_review') {
      row.status = 'dg_review'
    } else if (row.status === 'dg_review') {
      row.status = 'finance_review'
    } else if (row.status === 'finance_review') {
      const deptKey = row.department.trim().toLowerCase()
      const util = this.tryApplyUtilizationForDepartment(deptKey, row.amount)
      if (!util.ok) return { ok: false, status: 400, error: util.error }
      row.status = 'approved'
    } else {
      return { ok: false, status: 400, error: `Cannot approve from status ${row.status}` }
    }
    row.updatedAt = now
    return { ok: true, row: parseRequisitionJson(row) }
  }
}

const FINANCE_STORE_TTL_MS = 8_000

let financeStoreCache: { store: FinanceApiStore; at: number } | null = null
let financeStorePromise: Promise<FinanceApiStore> | null = null

export function invalidateFinanceApiStoreCache(): void {
  financeStoreCache = null
  financeStorePromise = null
}

export async function getFinanceApiStore(): Promise<FinanceApiStore> {
  const now = Date.now()
  if (financeStoreCache && now - financeStoreCache.at < FINANCE_STORE_TTL_MS) {
    return financeStoreCache.store
  }
  if (!financeStorePromise) {
    financeStorePromise = FinanceApiStore.loadFromDatabase()
      .then((store) => {
        financeStoreCache = { store, at: Date.now() }
        financeStorePromise = null
        return store
      })
      .catch((err) => {
        financeStorePromise = null
        throw err
      })
  }
  return financeStorePromise
}

export async function commitFinanceApiStore(store: FinanceApiStore): Promise<void> {
  await store.saveToDatabase()
  invalidateFinanceApiStoreCache()
}

export async function buildDepartmentBudgetOverviewFromStore(departmentKey: string) {
  const store = await getFinanceApiStore()
  const lines = filterFinanceBudgetsForDepartment(store.budgets, departmentKey)
  const totalAllocated = lines.reduce((s, b) => s + b.totalAmount, 0)
  const totalUtilized = lines.reduce((s, b) => s + b.utilizedAmount, 0)
  return {
    source: 'finance_master_budget_lines' as const,
    department: departmentKey.trim().toLowerCase(),
    lines: lines.map(parseBudgetJson),
    totals: {
      totalAllocated,
      totalUtilized,
      totalAvailable: totalAllocated - totalUtilized,
    },
  }
}

export async function buildHydrologicalBudgetOverviewFromStore() {
  return buildDepartmentBudgetOverviewFromStore('hydrological')
}
