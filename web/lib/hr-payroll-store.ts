import { getSql } from '@/lib/db'
import { ensureHrSchema } from '@/lib/db/hr-schema'
import { appendHrAuditLog } from '@/lib/hr-audit-log'
import { listHrEmployees } from '@/lib/hr-employee-store'
import type {
  HrPayrollLine,
  HrPayrollLineType,
  HrPayrollRun,
  HrPayrollRunStatus,
} from '@/lib/hr-types'

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

export function computeLineAmounts(
  line: Pick<
    HrPayrollLine,
    'gross' | 'allowances' | 'deductions' | 'overtimeAmount'
  >,
  taxRatePct: number
): { taxAmount: number; net: number } {
  const taxable = line.gross + line.allowances + line.overtimeAmount - line.deductions
  const taxAmount = roundMoney(Math.max(0, taxable) * (taxRatePct / 100))
  const net = roundMoney(
    line.gross + line.allowances + line.overtimeAmount - line.deductions - taxAmount
  )
  return { taxAmount, net }
}

function rowToRun(r: Record<string, unknown>): HrPayrollRun {
  return {
    id: String(r.id),
    period: String(r.period),
    title: String(r.title ?? ''),
    status: String(r.status ?? 'draft') as HrPayrollRunStatus,
    defaultTaxRatePct: Number(r.default_tax_rate_pct ?? 15),
    notes: String(r.notes ?? ''),
    submittedAt: r.submitted_at != null ? new Date(String(r.submitted_at)) : null,
    hrApprovedAt: r.hr_approved_at != null ? new Date(String(r.hr_approved_at)) : null,
    hrApprovedBy: r.hr_approved_by != null ? String(r.hr_approved_by) : null,
    financeApprovedAt:
      r.finance_approved_at != null ? new Date(String(r.finance_approved_at)) : null,
    financeApprovedBy: r.finance_approved_by != null ? String(r.finance_approved_by) : null,
    disbursedAt: r.disbursed_at != null ? new Date(String(r.disbursed_at)) : null,
    disbursedBy: r.disbursed_by != null ? String(r.disbursed_by) : null,
    rejectedAt: r.rejected_at != null ? new Date(String(r.rejected_at)) : null,
    rejectedBy: r.rejected_by != null ? String(r.rejected_by) : null,
    createdBy: r.created_by != null ? String(r.created_by) : null,
    createdAt: new Date(String(r.created_at)),
    updatedAt: new Date(String(r.updated_at)),
  }
}

function rowToLine(r: Record<string, unknown>): HrPayrollLine {
  return {
    id: String(r.id),
    runId: String(r.run_id),
    employeeId: String(r.employee_id),
    employeeName: r.employee_name != null ? String(r.employee_name) : undefined,
    employeeNumber: r.employee_number != null ? String(r.employee_number) : undefined,
    lineType: String(r.line_type ?? 'salary') as HrPayrollLineType,
    gross: Number(r.gross ?? 0),
    allowances: Number(r.allowances ?? 0),
    deductions: Number(r.deductions ?? 0),
    overtimeAmount: Number(r.overtime_amount ?? 0),
    taxAmount: Number(r.tax_amount ?? 0),
    net: Number(r.net ?? 0),
    notes: String(r.notes ?? ''),
    createdAt: new Date(String(r.created_at)),
    updatedAt: new Date(String(r.updated_at)),
  }
}

export function hrPayrollRunToJson(r: HrPayrollRun) {
  return {
    ...r,
    submittedAt: r.submittedAt?.toISOString() ?? null,
    hrApprovedAt: r.hrApprovedAt?.toISOString() ?? null,
    financeApprovedAt: r.financeApprovedAt?.toISOString() ?? null,
    disbursedAt: r.disbursedAt?.toISOString() ?? null,
    rejectedAt: r.rejectedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

export function hrPayrollLineToJson(l: HrPayrollLine) {
  return {
    ...l,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  }
}

export async function listPayrollRuns(): Promise<HrPayrollRun[]> {
  await ensureHrSchema()
  const sql = getSql()
  const rows = await sql`SELECT * FROM hr_payroll_runs ORDER BY period DESC, created_at DESC`
  return (rows as Record<string, unknown>[]).map(rowToRun)
}

export async function getPayrollRunById(id: string): Promise<HrPayrollRun | null> {
  await ensureHrSchema()
  const sql = getSql()
  const rows = await sql`SELECT * FROM hr_payroll_runs WHERE id = ${id}`
  const row = (rows as Record<string, unknown>[])[0]
  return row ? rowToRun(row) : null
}

export async function listPayrollLines(runId: string): Promise<HrPayrollLine[]> {
  await ensureHrSchema()
  const sql = getSql()
  const rows = await sql`
    SELECT l.*, e.full_name AS employee_name, e.employee_number
    FROM hr_payroll_lines l
    LEFT JOIN hr_employees e ON e.id = l.employee_id
    WHERE l.run_id = ${runId}
    ORDER BY e.full_name ASC
  `
  return (rows as Record<string, unknown>[]).map(rowToLine)
}

export async function createPayrollRun(input: {
  period: string
  title?: string
  defaultTaxRatePct?: number
  notes?: string
  createdBy: string | null
}): Promise<HrPayrollRun> {
  await ensureHrSchema()
  const sql = getSql()
  const id = `pr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const now = new Date().toISOString()
  const title = input.title?.trim() || `Payroll ${input.period}`
  const tax = input.defaultTaxRatePct ?? 15
  await sql`
    INSERT INTO hr_payroll_runs (
      id, period, title, status, default_tax_rate_pct, notes, created_by, created_at, updated_at
    ) VALUES (
      ${id}, ${input.period}, ${title}, 'draft', ${tax}, ${input.notes ?? ''},
      ${input.createdBy}, ${now}, ${now}
    )
  `
  await appendHrAuditLog({
    entityType: 'hr_payroll_run',
    entityId: id,
    action: 'create',
    actorUserId: input.createdBy,
  })
  return (await getPayrollRunById(id))!
}

export async function updatePayrollRun(
  id: string,
  patch: { title?: string; defaultTaxRatePct?: number; notes?: string },
  actorUserId: string | null
): Promise<HrPayrollRun | null> {
  const existing = await getPayrollRunById(id)
  if (!existing || existing.status !== 'draft') return null
  await ensureHrSchema()
  const sql = getSql()
  const now = new Date().toISOString()
  const tax = patch.defaultTaxRatePct ?? existing.defaultTaxRatePct
  await sql`
    UPDATE hr_payroll_runs SET
      title = ${patch.title ?? existing.title},
      default_tax_rate_pct = ${tax},
      notes = ${patch.notes ?? existing.notes},
      updated_at = ${now}
    WHERE id = ${id}
  `
  if (patch.defaultTaxRatePct != null) {
    await recalcAllLinesForRun(id, tax)
  }
  await appendHrAuditLog({
    entityType: 'hr_payroll_run',
    entityId: id,
    action: 'update',
    actorUserId,
    payload: patch as Record<string, unknown>,
  })
  return getPayrollRunById(id)
}

async function recalcAllLinesForRun(runId: string, taxRatePct: number): Promise<void> {
  const lines = await listPayrollLines(runId)
  const sql = getSql()
  const now = new Date().toISOString()
  for (const line of lines) {
    const { taxAmount, net } = computeLineAmounts(line, taxRatePct)
    await sql`
      UPDATE hr_payroll_lines SET tax_amount = ${taxAmount}, net = ${net}, updated_at = ${now}
      WHERE id = ${line.id}
    `
  }
}

export async function generateLinesFromEmployees(
  runId: string,
  actorUserId: string | null
): Promise<{ created: number }> {
  const run = await getPayrollRunById(runId)
  if (!run || run.status !== 'draft') return { created: 0 }

  const employees = (await listHrEmployees()).filter((e) => e.employmentStatus === 'active')
  const existing = await listPayrollLines(runId)
  const existingIds = new Set(existing.map((l) => l.employeeId))
  const sql = getSql()
  const now = new Date().toISOString()
  let created = 0

  for (const emp of employees) {
    if (existingIds.has(emp.id)) continue
    const lineType: HrPayrollLineType =
      emp.employmentType === 'volunteer' ? 'stipend' : 'salary'
    const gross =
      lineType === 'stipend'
        ? emp.stipendAmount ?? 0
        : emp.salaryAmount ?? 0
    if (gross <= 0) continue

    const { taxAmount, net } = computeLineAmounts(
      { gross, allowances: 0, deductions: 0, overtimeAmount: 0 },
      run.defaultTaxRatePct
    )
    const id = `pl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    await sql`
      INSERT INTO hr_payroll_lines (
        id, run_id, employee_id, line_type, gross, allowances, deductions,
        overtime_amount, tax_amount, net, created_at, updated_at
      ) VALUES (
        ${id}, ${runId}, ${emp.id}, ${lineType}, ${gross}, 0, 0, 0,
        ${taxAmount}, ${net}, ${now}, ${now}
      )
    `
    created++
  }

  if (created > 0) {
    await appendHrAuditLog({
      entityType: 'hr_payroll_run',
      entityId: runId,
      action: 'generate_lines',
      actorUserId,
      payload: { created },
    })
  }
  return { created }
}

export async function updatePayrollLine(
  lineId: string,
  patch: {
    allowances?: number
    deductions?: number
    overtimeAmount?: number
    notes?: string
  },
  actorUserId: string | null
): Promise<HrPayrollLine | null> {
  await ensureHrSchema()
  const sql = getSql()
  const rows = await sql`SELECT * FROM hr_payroll_lines WHERE id = ${lineId}`
  const row = (rows as Record<string, unknown>[])[0]
  if (!row) return null
  const line = rowToLine(row)
  const run = await getPayrollRunById(line.runId)
  if (!run || run.status !== 'draft') return null

  const updated = {
    ...line,
    allowances: patch.allowances ?? line.allowances,
    deductions: patch.deductions ?? line.deductions,
    overtimeAmount: patch.overtimeAmount ?? line.overtimeAmount,
    notes: patch.notes ?? line.notes,
  }
  const { taxAmount, net } = computeLineAmounts(updated, run.defaultTaxRatePct)
  const now = new Date().toISOString()
  await sql`
    UPDATE hr_payroll_lines SET
      allowances = ${updated.allowances},
      deductions = ${updated.deductions},
      overtime_amount = ${updated.overtimeAmount},
      tax_amount = ${taxAmount},
      net = ${net},
      notes = ${updated.notes},
      updated_at = ${now}
    WHERE id = ${lineId}
  `
  await appendHrAuditLog({
    entityType: 'hr_payroll_line',
    entityId: lineId,
    action: 'update',
    actorUserId,
  })
  const lines = await listPayrollLines(line.runId)
  return lines.find((l) => l.id === lineId) ?? null
}

export async function submitPayrollRun(
  id: string,
  actorUserId: string | null
): Promise<{ ok: true; run: HrPayrollRun } | { ok: false; error: string; status: number }> {
  const run = await getPayrollRunById(id)
  if (!run) return { ok: false, error: 'Run not found.', status: 404 }
  if (run.status !== 'draft') return { ok: false, error: 'Only draft runs can be submitted.', status: 400 }
  const lines = await listPayrollLines(id)
  if (lines.length === 0) return { ok: false, error: 'Add payroll lines first.', status: 400 }

  await ensureHrSchema()
  const sql = getSql()
  const now = new Date().toISOString()
  await sql`
    UPDATE hr_payroll_runs SET status = 'submitted', submitted_at = ${now}, updated_at = ${now}
    WHERE id = ${id}
  `
  await appendHrAuditLog({
    entityType: 'hr_payroll_run',
    entityId: id,
    action: 'submit',
    actorUserId,
  })
  return { ok: true, run: (await getPayrollRunById(id))! }
}

export async function applyPayrollDecision(
  id: string,
  input: { action: 'approve' | 'reject'; stage: 'hr' | 'finance' },
  actorUserId: string | null,
  actorName: string
): Promise<{ ok: true; run: HrPayrollRun } | { ok: false; error: string; status: number }> {
  const run = await getPayrollRunById(id)
  if (!run) return { ok: false, error: 'Run not found.', status: 404 }

  await ensureHrSchema()
  const sql = getSql()
  const now = new Date().toISOString()

  if (input.action === 'reject') {
    if (run.status === 'draft' || run.status === 'disbursed' || run.status === 'rejected') {
      return { ok: false, error: 'Cannot reject in this status.', status: 400 }
    }
    await sql`
      UPDATE hr_payroll_runs SET
        status = 'rejected', rejected_at = ${now}, rejected_by = ${actorName}, updated_at = ${now}
      WHERE id = ${id}
    `
    await appendHrAuditLog({
      entityType: 'hr_payroll_run',
      entityId: id,
      action: 'reject',
      actorUserId,
    })
    return { ok: true, run: (await getPayrollRunById(id))! }
  }

  if (input.stage === 'hr' && run.status === 'submitted') {
    await sql`
      UPDATE hr_payroll_runs SET
        status = 'hr_approved', hr_approved_at = ${now}, hr_approved_by = ${actorName}, updated_at = ${now}
      WHERE id = ${id}
    `
    return { ok: true, run: (await getPayrollRunById(id))! }
  }

  if (input.stage === 'finance' && run.status === 'hr_approved') {
    await sql`
      UPDATE hr_payroll_runs SET
        status = 'finance_approved',
        finance_approved_at = ${now},
        finance_approved_by = ${actorName},
        updated_at = ${now}
      WHERE id = ${id}
    `
    return { ok: true, run: (await getPayrollRunById(id))! }
  }

  return { ok: false, error: 'Invalid action for current status.', status: 400 }
}

export async function disbursePayrollRun(
  id: string,
  actorUserId: string | null,
  actorName: string
): Promise<{ ok: true; run: HrPayrollRun } | { ok: false; error: string; status: number }> {
  const run = await getPayrollRunById(id)
  if (!run) return { ok: false, error: 'Run not found.', status: 404 }
  if (run.status !== 'finance_approved') {
    return { ok: false, error: 'Run must be finance-approved first.', status: 400 }
  }
  await ensureHrSchema()
  const sql = getSql()
  const now = new Date().toISOString()
  await sql`
    UPDATE hr_payroll_runs SET
      status = 'disbursed', disbursed_at = ${now}, disbursed_by = ${actorName}, updated_at = ${now}
    WHERE id = ${id}
  `
  await appendHrAuditLog({
    entityType: 'hr_payroll_run',
    entityId: id,
    action: 'disburse',
    actorUserId,
  })
  return { ok: true, run: (await getPayrollRunById(id))! }
}

export function aggregateRunTotals(lines: HrPayrollLine[]) {
  return lines.reduce(
    (acc, l) => {
      acc.gross += l.gross
      acc.allowances += l.allowances
      acc.deductions += l.deductions
      acc.overtime += l.overtimeAmount
      acc.tax += l.taxAmount
      acc.net += l.net
      acc.count += 1
      return acc
    },
    { gross: 0, allowances: 0, deductions: 0, overtime: 0, tax: 0, net: 0, count: 0 }
  )
}

export function buildBankExportCsv(
  lines: HrPayrollLine[],
  period: string
): string {
  const header = 'employee_number,full_name,net_amount,currency,period,reference'
  const rows = lines.map((l) => {
    const num = l.employeeNumber ?? ''
    const name = (l.employeeName ?? '').replace(/"/g, '""')
    return `${num},"${name}",${l.net.toFixed(2)},SLE,${period},PAY-${period}`
  })
  return [header, ...rows].join('\n')
}
