import { randomUUID } from 'crypto'
import { getSql, isPostgresUndefinedRelationError } from '@/lib/db'
import type { HydroPublicPortalHodWorkflow, StoredPublicRequisition } from '@/lib/hydro-public-portals-stub'
import { toCanonicalDept } from '@/lib/orgDepartments'

export type PortalLinksPayload = {
  departmentBudget: null
  staffLink: { configured: boolean; updatedAt: string | null }
  perDiemLink: { configured: boolean; updatedAt: string | null }
  /** True when `hydro_portal_links` (or related) tables are missing — run Prisma migrations on the same DB. */
  schemaMissing?: boolean
  hint?: string
}

const EMPTY_PORTAL_PAYLOAD: PortalLinksPayload = {
  departmentBudget: null,
  staffLink: { configured: false, updatedAt: null },
  perDiemLink: { configured: false, updatedAt: null },
}

const SCHEMA_HINT =
  'Create ERP tables in this Supabase database (same DATABASE_URL as web/.env.local). From the repo run: cd server && npx prisma migrate deploy'

export async function getPortalLinksPayload(): Promise<PortalLinksPayload> {
  try {
    const sql = getSql()
    const rows = (await sql`SELECT kind, token, updated_at FROM hydro_portal_links`) as Record<
      string,
      unknown
    >[]
    const staff = rows.find((r) => r.kind === 'staff')
    const perDiem = rows.find((r) => r.kind === 'per_diem')
    return {
      departmentBudget: null,
      staffLink: {
        configured: Boolean(staff?.token),
        updatedAt: staff?.updated_at != null ? String(staff.updated_at) : null,
      },
      perDiemLink: {
        configured: Boolean(perDiem?.token),
        updatedAt: perDiem?.updated_at != null ? String(perDiem.updated_at) : null,
      },
    }
  } catch (e) {
    if (isPostgresUndefinedRelationError(e)) {
      return {
        ...EMPTY_PORTAL_PAYLOAD,
        schemaMissing: true,
        hint: SCHEMA_HINT,
      }
    }
    throw e
  }
}

export async function rotateStaffLink(): Promise<{ path: string; updatedAt: string }> {
  const token = randomUUID().slice(0, 12)
  const updatedAt = new Date().toISOString()
  const sql = getSql()
  await sql`
    INSERT INTO hydro_portal_links (kind, token, updated_at)
    VALUES ('staff', ${token}, ${updatedAt})
    ON CONFLICT (kind) DO UPDATE SET token = EXCLUDED.token, updated_at = EXCLUDED.updated_at
  `
  return { path: `/hydrological/public/staff/${token}`, updatedAt }
}

export async function rotatePerDiemLink(): Promise<{ path: string; updatedAt: string }> {
  const token = randomUUID().slice(0, 12)
  const updatedAt = new Date().toISOString()
  const sql = getSql()
  await sql`
    INSERT INTO hydro_portal_links (kind, token, updated_at)
    VALUES ('per_diem', ${token}, ${updatedAt})
    ON CONFLICT (kind) DO UPDATE SET token = EXCLUDED.token, updated_at = EXCLUDED.updated_at
  `
  return { path: `/hydrological/public/per-diem/${token}`, updatedAt }
}

export async function getStaffToken(): Promise<string | null> {
  const sql = getSql()
  const rows = await sql`SELECT token FROM hydro_portal_links WHERE kind = 'staff'`
  const r = rows[0] as { token?: string } | undefined
  return r?.token ?? null
}

export async function getPerDiemToken(): Promise<string | null> {
  const sql = getSql()
  const rows = await sql`SELECT token FROM hydro_portal_links WHERE kind = 'per_diem'`
  const r = rows[0] as { token?: string } | undefined
  return r?.token ?? null
}

export async function isStaffTokenActive(token: string): Promise<boolean> {
  const raw = decodeURIComponent(token)
  const active = await getStaffToken()
  return active !== null && active === raw
}

export async function isPerDiemTokenActive(token: string): Promise<boolean> {
  const raw = decodeURIComponent(token)
  const active = await getPerDiemToken()
  return active !== null && active === raw
}

function mapRow(r: Record<string, unknown>): StoredPublicRequisition {
  const wf = String(r.hod_workflow ?? 'pending_hod') as HydroPublicPortalHodWorkflow
  const deptRaw = String(r.department ?? 'hydrological')
  const canon = toCanonicalDept(deptRaw)
  return {
    id: Number(r.id),
    kind: String(r.kind) as 'staff' | 'per_diem',
    token: String(r.token),
    title: String(r.title),
    description: String(r.description),
    requestedBy: String(r.requested_by),
    requesterEmail: String(r.requester_email),
    amount: Number(r.amount),
    department: canon ?? deptRaw,
    budgetCode: String(r.budget_code ?? ''),
    createdAt: new Date(String(r.created_at)).toISOString(),
    hodWorkflow: wf === 'released' || wf === 'pending_hod' ? wf : 'pending_hod',
  }
}

export async function listAllHydrologicalPublicRequests(): Promise<StoredPublicRequisition[]> {
  const sql = getSql()
  const rows = await sql`SELECT * FROM hydro_portal_requests ORDER BY id`
  return (rows as Record<string, unknown>[]).map(mapRow)
}

export async function getPortalRequestById(
  id: number,
): Promise<StoredPublicRequisition | null> {
  const sql = getSql()
  const rows = await sql`SELECT * FROM hydro_portal_requests WHERE id = ${id}`
  const r = rows[0] as Record<string, unknown> | undefined
  return r ? mapRow(r) : null
}

type SubmitPortalRequestInput = {
  token: string
  title: string
  description: string
  requestedBy: string
  requesterEmail: string
  amount: number
  department: string
  budgetCode: string
}

async function insertPortalRequest(
  kind: 'staff' | 'per_diem',
  input: SubmitPortalRequestInput,
): Promise<number> {
  const sql = getSql()
  const rows = await sql`
    INSERT INTO hydro_portal_requests (
      kind, token, title, description, requested_by, requester_email, amount,
      department, budget_code, hod_workflow
    ) VALUES (
      ${kind},
      ${input.token},
      ${input.title},
      ${input.description},
      ${input.requestedBy},
      ${input.requesterEmail},
      ${input.amount},
      ${input.department},
      ${input.budgetCode},
      'pending_hod'
    )
    RETURNING id
  `
  return Number((rows[0] as { id: number }).id)
}

export async function submitStaffRequest(input: SubmitPortalRequestInput): Promise<number> {
  return insertPortalRequest('staff', input)
}

export async function submitPerDiemRequest(input: SubmitPortalRequestInput): Promise<number> {
  return insertPortalRequest('per_diem', input)
}

export async function releaseHydrologicalPublicRequisition(
  id: number
): Promise<{ ok: true } | { ok: false; code: 'not_found' }> {
  const sql = getSql()
  const found = await sql`SELECT id FROM hydro_portal_requests WHERE id = ${id}`
  if ((found as unknown[]).length === 0) return { ok: false, code: 'not_found' }
  await sql`UPDATE hydro_portal_requests SET hod_workflow = 'released' WHERE id = ${id}`
  return { ok: true }
}
