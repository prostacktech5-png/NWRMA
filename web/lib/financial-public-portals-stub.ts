import { randomUUID } from 'crypto'
import { getSql } from '@/lib/db'
import {
  getFinanceApiStore,
  parseBudgetJson,
  type FinanceBudget,
} from '@/lib/finance-api-store'

type LinkState = {
  token: string | null
  updatedAt: string | null
}

const META_STAFF = 'financial_public_staff_link'
const META_PER_DIEM = 'financial_public_per_diem_link'

async function readLinkMeta(key: string): Promise<LinkState> {
  const sql = getSql()
  const rows = await sql`SELECT value FROM app_meta WHERE key = ${key}`
  const raw = (rows[0] as { value?: string } | undefined)?.value
  if (!raw) return { token: null, updatedAt: null }
  try {
    const j = JSON.parse(raw) as { token?: string | null; updatedAt?: string | null }
    return { token: j.token ?? null, updatedAt: j.updatedAt ?? null }
  } catch {
    return { token: null, updatedAt: null }
  }
}

async function writeLinkMeta(key: string, state: LinkState): Promise<void> {
  const sql = getSql()
  const value = JSON.stringify(state)
  await sql`
    INSERT INTO app_meta (key, value) VALUES (${key}, ${value})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `
}

export type FinancialPublicProgrammeBudgetInfo = {
  code: string
  budgetId: number
  label: string
  project: string
  fiscalYear: string
  availableBalance: number
  pendingCommittedInApprovalPipeline?: number
}

export async function resolveFinancialProgrammeBudget():
  Promise<
    { ok: true; budget: FinanceBudget; pendingPipeline: number } | { ok: false; error: string }
  > {
  const store = await getFinanceApiStore()
  const row =
    store.budgets.find((b) => b.budgetCode === 'FIN-001') ??
    store.budgets.find((b) => b.department === 'financial')
  if (!row) return { ok: false, error: 'Financial programme budget line not found' }
  const pendingPipeline = store.pendingPipelineForBudget(row.id)
  return { ok: true, budget: row, pendingPipeline }
}

export function settingsPublicPortalsBudgetPayload(
  resolved: { ok: true; budget: FinanceBudget; pendingPipeline: number },
  label: string,
  fallbackCode: string
): FinancialPublicProgrammeBudgetInfo {
  const b = resolved.budget
  const parsed = parseBudgetJson(b)
  return {
    code: b.budgetCode || fallbackCode,
    budgetId: b.id,
    label,
    project: b.project,
    fiscalYear: b.fiscalYear,
    availableBalance: parsed.availableBalance - resolved.pendingPipeline,
    pendingCommittedInApprovalPipeline: resolved.pendingPipeline,
  }
}

export async function getFinancialPublicPortalsPayload() {
  const staff = await readLinkMeta(META_STAFF)
  const perDiem = await readLinkMeta(META_PER_DIEM)
  const resolved = await resolveFinancialProgrammeBudget()
  const departmentBudget =
    resolved.ok ?
      settingsPublicPortalsBudgetPayload(
        resolved,
        'Financial department programme budget',
        'FIN-001'
      )
    : null

  return {
    departmentBudget,
    staffLink: {
      configured: Boolean(staff.token),
      updatedAt: staff.updatedAt,
    },
    perDiemLink: {
      configured: Boolean(perDiem.token),
      updatedAt: perDiem.updatedAt,
    },
  }
}

export async function rotateFinancialPublicStaffLink(): Promise<{ path: string; updatedAt: string }> {
  const token = randomUUID().slice(0, 12)
  const updatedAt = new Date().toISOString()
  await writeLinkMeta(META_STAFF, { token, updatedAt })
  return { path: `/financial/public-staff/${token}`, updatedAt }
}

export async function rotateFinancialPublicPerDiemLink(): Promise<{ path: string; updatedAt: string }> {
  const token = randomUUID().slice(0, 12)
  const updatedAt = new Date().toISOString()
  await writeLinkMeta(META_PER_DIEM, { token, updatedAt })
  return { path: `/financial/public-per-diem/${token}`, updatedAt }
}
