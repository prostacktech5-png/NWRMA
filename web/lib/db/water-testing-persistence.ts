import { randomUUID } from 'crypto'
import { getSql, isPostgresUndefinedRelationError } from '@/lib/db'
import type { LabRequest, LabRequestPriority, LabRequestStatus } from '@/lib/types'

function parseTestsRequested(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((t): t is string => typeof t === 'string')
  }
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw) as unknown
      return parseTestsRequested(p)
    } catch {
      return []
    }
  }
  return []
}

function parseResults(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw) as unknown
      return parseResults(p)
    } catch {
      return null
    }
  }
  return null
}

function mapRow(r: Record<string, unknown>): LabRequest {
  return {
    id: String(r.id),
    reference: String(r.reference),
    publicCaseId: r.public_case_id != null ? String(r.public_case_id) : null,
    requesterName: String(r.requester_name),
    requesterEmail: String(r.requester_email),
    requesterPhone: r.requester_phone != null ? String(r.requester_phone) : null,
    organisation: String(r.organisation),
    siteAddress: String(r.site_address),
    testsRequested: parseTestsRequested(r.tests_requested),
    priority: (String(r.priority) || 'normal') as LabRequestPriority,
    status: String(r.status) as LabRequestStatus,
    assignedToUserId:
      r.assigned_to_user_id != null ? String(r.assigned_to_user_id) : null,
    assignedToName: r.assigned_to_name != null ? String(r.assigned_to_name) : null,
    sampleCollectionScheduledAt:
      r.sample_collection_scheduled_at != null
        ? new Date(String(r.sample_collection_scheduled_at))
        : null,
    reportNotes: r.report_notes != null ? String(r.report_notes) : null,
    notes: r.notes != null ? String(r.notes) : null,
    receivedAt: new Date(String(r.received_at)),
    completedAt: r.completed_at != null ? new Date(String(r.completed_at)) : null,
    results: parseResults(r.results),
  }
}

export async function allocateNextWaterTestingReference(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `WT-${year}-`
  const sql = getSql()
  const rows = (await sql`
    SELECT reference FROM water_testing_requests
    WHERE reference LIKE ${prefix + '%'}
    ORDER BY reference DESC
    LIMIT 1
  `) as { reference: string }[]
  let seq = 1
  if (rows[0]?.reference) {
    const tail = rows[0].reference.slice(prefix.length)
    const n = parseInt(tail, 10)
    if (Number.isFinite(n)) seq = n + 1
  }
  return `${prefix}${String(seq).padStart(5, '0')}`
}

export type CreateWaterTestingRequestInput = {
  requesterName: string
  requesterEmail: string
  requesterPhone?: string | null
  organisation: string
  siteAddress: string
  testsRequested: string[]
  priority?: LabRequestPriority
  notes?: string | null
  publicCaseId?: string | null
}

export async function createWaterTestingRequest(
  input: CreateWaterTestingRequestInput,
): Promise<LabRequest> {
  const sql = getSql()
  const id = randomUUID()
  const reference = await allocateNextWaterTestingReference()
  const priority = input.priority ?? 'normal'
  const testsJson = JSON.stringify(input.testsRequested)
  const now = new Date()

  const rows = await sql`
    INSERT INTO water_testing_requests (
      id, reference, public_case_id,
      requester_name, requester_email, requester_phone,
      organisation, site_address, tests_requested, priority, status, notes,
      received_at, created_at, updated_at
    ) VALUES (
      ${id},
      ${reference},
      ${input.publicCaseId ?? null},
      ${input.requesterName.trim()},
      ${input.requesterEmail.trim().toLowerCase()},
      ${input.requesterPhone?.trim() || null},
      ${input.organisation.trim()},
      ${input.siteAddress.trim()},
      ${testsJson}::jsonb,
      ${priority},
      'received',
      ${input.notes?.trim() || null},
      ${now},
      ${now},
      ${now}
    )
    RETURNING *
  `
  return mapRow(rows[0] as Record<string, unknown>)
}

export async function listWaterTestingRequests(options?: {
  status?: string
  limit?: number
}): Promise<LabRequest[]> {
  const sql = getSql()
  const limit = Math.min(Math.max(options?.limit ?? 500, 1), 500)
  const status = options?.status?.trim()

  const rows = status
    ? await sql`
        SELECT * FROM water_testing_requests
        WHERE status = ${status}
        ORDER BY received_at DESC
        LIMIT ${limit}
      `
    : await sql`
        SELECT * FROM water_testing_requests
        ORDER BY received_at DESC
        LIMIT ${limit}
      `

  return (rows as Record<string, unknown>[]).map(mapRow)
}

export async function getWaterTestingRequestById(id: string): Promise<LabRequest | null> {
  const sql = getSql()
  const rows = await sql`SELECT * FROM water_testing_requests WHERE id = ${id}`
  const r = rows[0] as Record<string, unknown> | undefined
  return r ? mapRow(r) : null
}

export async function getWaterTestingRequestByReference(
  reference: string,
): Promise<LabRequest | null> {
  const sql = getSql()
  const rows = await sql`
    SELECT * FROM water_testing_requests WHERE reference = ${reference.trim()}
  `
  const r = rows[0] as Record<string, unknown> | undefined
  return r ? mapRow(r) : null
}

export async function getWaterTestingRequestByPublicCaseId(
  publicCaseId: string,
): Promise<LabRequest | null> {
  const sql = getSql()
  const rows = await sql`
    SELECT * FROM water_testing_requests WHERE public_case_id = ${publicCaseId.trim()}
  `
  const r = rows[0] as Record<string, unknown> | undefined
  return r ? mapRow(r) : null
}

export type SeedDemoWaterTestingResult = {
  created: number
  skipped: number
  deleted?: number
  references: string[]
  rows: LabRequest[]
}

export async function deleteWaterTestingDemoRequests(
  publicCaseIds: string[],
): Promise<number> {
  if (publicCaseIds.length === 0) return 0
  const sql = getSql()
  const rows = await sql`
    DELETE FROM water_testing_requests
    WHERE public_case_id IN ${sql(publicCaseIds)}
    RETURNING id
  `
  return (rows as unknown[]).length
}

export async function seedDemoWaterTestingRequests(
  demos: Array<{ publicCaseId: string; input: CreateWaterTestingRequestInput }>,
): Promise<SeedDemoWaterTestingResult> {
  const references: string[] = []
  const rows: LabRequest[] = []
  let created = 0
  let skipped = 0

  for (const demo of demos) {
    const existing = await getWaterTestingRequestByPublicCaseId(demo.publicCaseId)
    if (existing) {
      skipped += 1
      continue
    }
    const row = await createWaterTestingRequest({
      ...demo.input,
      publicCaseId: demo.publicCaseId,
    })
    created += 1
    references.push(row.reference)
    rows.push(row)
  }

  return { created, skipped, references, rows }
}

/** Remove prior demo rows and insert fresh Received requests (staff seed-demo). */
export async function recreateDemoWaterTestingRequests(
  demos: Array<{ publicCaseId: string; input: CreateWaterTestingRequestInput }>,
): Promise<SeedDemoWaterTestingResult> {
  const publicCaseIds = demos.map((d) => d.publicCaseId)
  const deleted = await deleteWaterTestingDemoRequests(publicCaseIds)

  const references: string[] = []
  const rows: LabRequest[] = []

  for (const demo of demos) {
    const row = await createWaterTestingRequest({
      ...demo.input,
      publicCaseId: demo.publicCaseId,
    })
    references.push(row.reference)
    rows.push(row)
  }

  return {
    created: rows.length,
    skipped: 0,
    deleted,
    references,
    rows,
  }
}

export async function touchWaterTestingEmailSent(id: string): Promise<void> {
  const sql = getSql()
  await sql`
    UPDATE water_testing_requests
    SET last_email_sent_at = NOW(), updated_at = NOW()
    WHERE id = ${id}
  `
}

export type PatchWaterTestingRequestInput = {
  status?: LabRequestStatus
  assignedToUserId?: string | null
  assignedToName?: string | null
  sampleCollectionScheduledAt?: Date | null
  results?: Record<string, unknown> | null
  reportNotes?: string | null
  completedAt?: Date | null
}

export async function patchWaterTestingRequest(
  id: string,
  patch: PatchWaterTestingRequestInput,
): Promise<LabRequest | null> {
  const existing = await getWaterTestingRequestById(id)
  if (!existing) return null

  const sql = getSql()
  const status = patch.status ?? existing.status
  const assignedToUserId =
    patch.assignedToUserId !== undefined
      ? patch.assignedToUserId
      : existing.assignedToUserId
  const assignedToName =
    patch.assignedToName !== undefined ? patch.assignedToName : existing.assignedToName
  const sampleAt =
    patch.sampleCollectionScheduledAt !== undefined
      ? patch.sampleCollectionScheduledAt
      : existing.sampleCollectionScheduledAt ?? null
  const results =
    patch.results !== undefined ? patch.results : existing.results
  const reportNotes =
    patch.reportNotes !== undefined ? patch.reportNotes : existing.reportNotes ?? null
  const completedAt =
    patch.completedAt !== undefined ? patch.completedAt : existing.completedAt

  const rows = await sql`
    UPDATE water_testing_requests SET
      status = ${status},
      assigned_to_user_id = ${assignedToUserId},
      assigned_to_name = ${assignedToName},
      sample_collection_scheduled_at = ${sampleAt},
      results = ${results != null ? JSON.stringify(results) : null}::jsonb,
      report_notes = ${reportNotes},
      completed_at = ${completedAt},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `
  const r = rows[0] as Record<string, unknown> | undefined
  return r ? mapRow(r) : null
}

export function isWaterTestingTableMissingError(e: unknown): boolean {
  return isPostgresUndefinedRelationError(e)
}
