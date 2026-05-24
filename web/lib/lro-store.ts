import { getSql } from '@/lib/db'
import { ensureLroSchema } from '@/lib/db/lro-schema'
import {
  COMPLIANCE_CASES,
  LEGAL_MATTERS,
  OUTREACH_CAMPAIGNS,
  REGULATIONS_LIBRARY,
  type CommunicationsTheme,
  type ComplianceCaseStatus,
  type LegalMatterStatus,
  type OutreachCampaignStatus,
} from '@/lib/compliance-mock-data'

export type EnforcementStage =
  | 'none'
  | 'notice'
  | 'compliance_order'
  | 'admin_penalty'
  | 'prosecution'

export type LroComplianceCase = {
  id: string
  reference: string
  entityName: string
  violationType: string
  workstream: string
  planYear: string
  status: ComplianceCaseStatus
  enforcementStage: EnforcementStage
  assignedOfficer: string
  dueDate: string | null
  notes: string
  licenseReference: string | null
  createdByUserId: string | null
  updatedByUserId: string | null
  createdAt: string
  updatedAt: string
}

export type LroLegalMatter = {
  id: string
  title: string
  matterType: 'byelaw' | 'representation' | 'advisory'
  status: LegalMatterStatus
  summary: string
  licenseReference: string | null
  createdByUserId: string | null
  updatedByUserId: string | null
  createdAt: string
  updatedAt: string
}

export type LroCampaign = {
  id: string
  title: string
  channel: string
  theme: CommunicationsTheme
  status: OutreachCampaignStatus
  startDate: string | null
  endDate: string | null
  notes: string
  createdByUserId: string | null
  updatedByUserId: string | null
  createdAt: string
  updatedAt: string
}

export type LroRegulationRef = {
  id: string
  category: 'Acts' | 'Regulations' | 'Policies'
  title: string
  summary: string
  externalUrl: string | null
  createdByUserId: string | null
  updatedByUserId: string | null
  createdAt: string
  updatedAt: string
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function isoDate(d: unknown): string | null {
  if (d == null) return null
  const s = String(d)
  return s.slice(0, 10)
}

function isoDateTime(d: unknown): string {
  return new Date(String(d)).toISOString()
}

function rowToCase(r: Record<string, unknown>): LroComplianceCase {
  return {
    id: String(r.id),
    reference: String(r.reference),
    entityName: String(r.entity_name),
    violationType: String(r.violation_type),
    workstream: String(r.workstream ?? ''),
    planYear: String(r.plan_year ?? ''),
    status: String(r.status) as ComplianceCaseStatus,
    enforcementStage: String(r.enforcement_stage ?? 'none') as EnforcementStage,
    assignedOfficer: String(r.assigned_officer ?? ''),
    dueDate: isoDate(r.due_date),
    notes: String(r.notes ?? ''),
    licenseReference: r.license_reference != null ? String(r.license_reference) : null,
    createdByUserId: r.created_by_user_id != null ? String(r.created_by_user_id) : null,
    updatedByUserId: r.updated_by_user_id != null ? String(r.updated_by_user_id) : null,
    createdAt: isoDateTime(r.created_at),
    updatedAt: isoDateTime(r.updated_at),
  }
}

function rowToMatter(r: Record<string, unknown>): LroLegalMatter {
  return {
    id: String(r.id),
    title: String(r.title),
    matterType: String(r.matter_type) as LroLegalMatter['matterType'],
    status: String(r.status) as LegalMatterStatus,
    summary: String(r.summary ?? ''),
    licenseReference: r.license_reference != null ? String(r.license_reference) : null,
    createdByUserId: r.created_by_user_id != null ? String(r.created_by_user_id) : null,
    updatedByUserId: r.updated_by_user_id != null ? String(r.updated_by_user_id) : null,
    createdAt: isoDateTime(r.created_at),
    updatedAt: isoDateTime(r.updated_at),
  }
}

function rowToCampaign(r: Record<string, unknown>): LroCampaign {
  return {
    id: String(r.id),
    title: String(r.title),
    channel: String(r.channel ?? ''),
    theme: String(r.theme) as CommunicationsTheme,
    status: String(r.status) as OutreachCampaignStatus,
    startDate: isoDate(r.start_date),
    endDate: isoDate(r.end_date),
    notes: String(r.notes ?? ''),
    createdByUserId: r.created_by_user_id != null ? String(r.created_by_user_id) : null,
    updatedByUserId: r.updated_by_user_id != null ? String(r.updated_by_user_id) : null,
    createdAt: isoDateTime(r.created_at),
    updatedAt: isoDateTime(r.updated_at),
  }
}

function rowToRegulation(r: Record<string, unknown>): LroRegulationRef {
  return {
    id: String(r.id),
    category: String(r.category) as LroRegulationRef['category'],
    title: String(r.title),
    summary: String(r.summary ?? ''),
    externalUrl: r.external_url != null ? String(r.external_url) : null,
    createdByUserId: r.created_by_user_id != null ? String(r.created_by_user_id) : null,
    updatedByUserId: r.updated_by_user_id != null ? String(r.updated_by_user_id) : null,
    createdAt: isoDateTime(r.created_at),
    updatedAt: isoDateTime(r.updated_at),
  }
}

export async function seedLroIfEmpty(actorUserId: string | null): Promise<void> {
  await ensureLroSchema()
  const sql = getSql()
  const [{ count: caseCount }] = (await sql`
    SELECT COUNT(*)::int AS count FROM lro_compliance_cases
  `) as { count: number }[]

  if (Number(caseCount) > 0) return

  for (const c of COMPLIANCE_CASES) {
    const id = newId('lro-case')
    await sql`
      INSERT INTO lro_compliance_cases (
        id, reference, entity_name, violation_type, workstream, plan_year,
        status, enforcement_stage, assigned_officer, due_date, notes,
        license_reference, created_by_user_id, updated_by_user_id
      ) VALUES (
        ${id},
        ${c.reference},
        ${c.entityName},
        ${c.violationType},
        ${c.workstream},
        ${c.planYear},
        ${c.status},
        ${c.status === 'escalated' ? 'notice' : 'none'},
        ${c.assignedOfficer},
        ${c.dueDate},
        '',
        NULL,
        ${actorUserId},
        ${actorUserId}
      )
    `
  }

  for (const m of LEGAL_MATTERS) {
    const id = newId('lro-legal')
    await sql`
      INSERT INTO lro_legal_matters (
        id, title, matter_type, status, summary, license_reference,
        created_by_user_id, updated_by_user_id, updated_at
      ) VALUES (
        ${id},
        ${m.title},
        ${m.matterType},
        ${m.status},
        '',
        ${m.matterType === 'representation' ? 'WR-884' : null},
        ${actorUserId},
        ${actorUserId},
        ${m.updatedAt}
      )
    `
  }

  for (const c of OUTREACH_CAMPAIGNS) {
    const id = newId('lro-camp')
    await sql`
      INSERT INTO lro_communications_campaigns (
        id, title, channel, theme, status, start_date,
        created_by_user_id, updated_by_user_id
      ) VALUES (
        ${id},
        ${c.title},
        ${c.channel},
        ${c.theme},
        ${c.status},
        ${c.startDate},
        ${actorUserId},
        ${actorUserId}
      )
    `
  }

  for (const r of REGULATIONS_LIBRARY) {
    const id = newId('lro-reg')
    await sql`
      INSERT INTO lro_regulation_refs (
        id, category, title, summary, created_by_user_id, updated_by_user_id
      ) VALUES (
        ${id},
        ${r.category},
        ${r.title},
        ${r.summary},
        ${actorUserId},
        ${actorUserId}
      )
    `
  }
}

export async function nextCaseReference(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `CMP-${year}-`
  await ensureLroSchema()
  const sql = getSql()
  const rows = (await sql`
    SELECT reference FROM lro_compliance_cases WHERE reference LIKE ${prefix + '%'}
  `) as { reference: string }[]
  let max = 0
  for (const r of rows) {
    const n = parseInt(r.reference.slice(prefix.length), 10)
    if (Number.isFinite(n) && n > max) max = n
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`
}

export async function listComplianceCases(search?: string): Promise<LroComplianceCase[]> {
  await ensureLroSchema()
  const sql = getSql()
  const rows = await sql`SELECT * FROM lro_compliance_cases ORDER BY updated_at DESC`
  let list = (rows as Record<string, unknown>[]).map(rowToCase)
  const q = search?.trim().toLowerCase()
  if (q) {
    list = list.filter(
      (c) =>
        c.reference.toLowerCase().includes(q) ||
        c.entityName.toLowerCase().includes(q) ||
        c.violationType.toLowerCase().includes(q) ||
        c.workstream.toLowerCase().includes(q) ||
        (c.licenseReference?.toLowerCase().includes(q) ?? false)
    )
  }
  return list
}

export async function getComplianceCaseById(id: string): Promise<LroComplianceCase | null> {
  await ensureLroSchema()
  const sql = getSql()
  const rows = await sql`SELECT * FROM lro_compliance_cases WHERE id = ${id}`
  const row = (rows as Record<string, unknown>[])[0]
  return row ? rowToCase(row) : null
}

export type CreateComplianceCaseInput = {
  entityName: string
  violationType: string
  workstream?: string
  planYear?: string
  assignedOfficer?: string
  dueDate?: string | null
  notes?: string
  licenseReference?: string | null
}

export async function createComplianceCase(
  input: CreateComplianceCaseInput,
  actorUserId: string | null
): Promise<LroComplianceCase> {
  await ensureLroSchema()
  const sql = getSql()
  const id = newId('lro-case')
  const reference = await nextCaseReference()
  await sql`
    INSERT INTO lro_compliance_cases (
      id, reference, entity_name, violation_type, workstream, plan_year,
      status, enforcement_stage, assigned_officer, due_date, notes,
      license_reference, created_by_user_id, updated_by_user_id
    ) VALUES (
      ${id},
      ${reference},
      ${input.entityName.trim()},
      ${input.violationType.trim()},
      ${input.workstream?.trim() ?? ''},
      ${input.planYear?.trim() ?? String(new Date().getFullYear())},
      'open',
      'none',
      ${input.assignedOfficer?.trim() ?? ''},
      ${input.dueDate ?? null},
      ${input.notes?.trim() ?? ''},
      ${input.licenseReference?.trim() || null},
      ${actorUserId},
      ${actorUserId}
    )
  `
  return (await getComplianceCaseById(id))!
}

export async function updateComplianceCase(
  id: string,
  patch: Partial<{
    entityName: string
    violationType: string
    workstream: string
    planYear: string
    status: ComplianceCaseStatus
    enforcementStage: EnforcementStage
    assignedOfficer: string
    dueDate: string | null
    notes: string
    licenseReference: string | null
  }>,
  actorUserId: string | null
): Promise<LroComplianceCase | null> {
  const existing = await getComplianceCaseById(id)
  if (!existing) return null
  await ensureLroSchema()
  const sql = getSql()
  await sql`
    UPDATE lro_compliance_cases SET
      entity_name = ${patch.entityName ?? existing.entityName},
      violation_type = ${patch.violationType ?? existing.violationType},
      workstream = ${patch.workstream ?? existing.workstream},
      plan_year = ${patch.planYear ?? existing.planYear},
      status = ${patch.status ?? existing.status},
      enforcement_stage = ${patch.enforcementStage ?? existing.enforcementStage},
      assigned_officer = ${patch.assignedOfficer ?? existing.assignedOfficer},
      due_date = ${patch.dueDate !== undefined ? patch.dueDate : existing.dueDate},
      notes = ${patch.notes ?? existing.notes},
      license_reference = ${
        patch.licenseReference !== undefined ? patch.licenseReference : existing.licenseReference
      },
      updated_by_user_id = ${actorUserId},
      updated_at = NOW()
    WHERE id = ${id}
  `
  return getComplianceCaseById(id)
}

export async function deleteComplianceCase(id: string): Promise<boolean> {
  await ensureLroSchema()
  const sql = getSql()
  const rows = await sql`DELETE FROM lro_compliance_cases WHERE id = ${id} RETURNING id`
  return (rows as unknown[]).length > 0
}

export async function listLegalMatters(opts?: {
  matterType?: string
  search?: string
}): Promise<LroLegalMatter[]> {
  await ensureLroSchema()
  const sql = getSql()
  const rows = await sql`SELECT * FROM lro_legal_matters ORDER BY updated_at DESC`
  let list = (rows as Record<string, unknown>[]).map(rowToMatter)
  if (opts?.matterType === 'representation') {
    list = list.filter((m) => m.matterType === 'representation' || m.matterType === 'advisory')
  } else if (opts?.matterType === 'byelaw') {
    list = list.filter((m) => m.matterType === 'byelaw')
  }
  const q = opts?.search?.trim().toLowerCase()
  if (q) list = list.filter((m) => m.title.toLowerCase().includes(q))
  return list
}

export async function getLegalMatterById(id: string): Promise<LroLegalMatter | null> {
  await ensureLroSchema()
  const sql = getSql()
  const rows = await sql`SELECT * FROM lro_legal_matters WHERE id = ${id}`
  const row = (rows as Record<string, unknown>[])[0]
  return row ? rowToMatter(row) : null
}

export async function createLegalMatter(
  input: {
    title: string
    matterType: LroLegalMatter['matterType']
    summary?: string
    licenseReference?: string | null
  },
  actorUserId: string | null
): Promise<LroLegalMatter> {
  await ensureLroSchema()
  const sql = getSql()
  const id = newId('lro-legal')
  await sql`
    INSERT INTO lro_legal_matters (
      id, title, matter_type, status, summary, license_reference,
      created_by_user_id, updated_by_user_id
    ) VALUES (
      ${id},
      ${input.title.trim()},
      ${input.matterType},
      'draft',
      ${input.summary?.trim() ?? ''},
      ${input.licenseReference?.trim() || null},
      ${actorUserId},
      ${actorUserId}
    )
  `
  return (await getLegalMatterById(id))!
}

export async function updateLegalMatter(
  id: string,
  patch: Partial<{
    title: string
    matterType: LroLegalMatter['matterType']
    status: LegalMatterStatus
    summary: string
    licenseReference: string | null
  }>,
  actorUserId: string | null
): Promise<LroLegalMatter | null> {
  const existing = await getLegalMatterById(id)
  if (!existing) return null
  await ensureLroSchema()
  const sql = getSql()
  await sql`
    UPDATE lro_legal_matters SET
      title = ${patch.title ?? existing.title},
      matter_type = ${patch.matterType ?? existing.matterType},
      status = ${patch.status ?? existing.status},
      summary = ${patch.summary ?? existing.summary},
      license_reference = ${
        patch.licenseReference !== undefined ? patch.licenseReference : existing.licenseReference
      },
      updated_by_user_id = ${actorUserId},
      updated_at = NOW()
    WHERE id = ${id}
  `
  return getLegalMatterById(id)
}

export async function listCampaigns(opts?: {
  theme?: CommunicationsTheme
  search?: string
}): Promise<LroCampaign[]> {
  await ensureLroSchema()
  const sql = getSql()
  const rows = await sql`SELECT * FROM lro_communications_campaigns ORDER BY start_date DESC NULLS LAST`
  let list = (rows as Record<string, unknown>[]).map(rowToCampaign)
  if (opts?.theme) list = list.filter((c) => c.theme === opts.theme)
  const q = opts?.search?.trim().toLowerCase()
  if (q) {
    list = list.filter(
      (c) =>
        c.title.toLowerCase().includes(q) || c.channel.toLowerCase().includes(q)
    )
  }
  return list
}

export async function getCampaignById(id: string): Promise<LroCampaign | null> {
  await ensureLroSchema()
  const sql = getSql()
  const rows = await sql`SELECT * FROM lro_communications_campaigns WHERE id = ${id}`
  const row = (rows as Record<string, unknown>[])[0]
  return row ? rowToCampaign(row) : null
}

export async function createCampaign(
  input: {
    title: string
    channel: string
    theme: CommunicationsTheme
    startDate?: string | null
    endDate?: string | null
    notes?: string
  },
  actorUserId: string | null
): Promise<LroCampaign> {
  await ensureLroSchema()
  const sql = getSql()
  const id = newId('lro-camp')
  await sql`
    INSERT INTO lro_communications_campaigns (
      id, title, channel, theme, status, start_date, end_date, notes,
      created_by_user_id, updated_by_user_id
    ) VALUES (
      ${id},
      ${input.title.trim()},
      ${input.channel.trim()},
      ${input.theme},
      'planned',
      ${input.startDate ?? null},
      ${input.endDate ?? null},
      ${input.notes?.trim() ?? ''},
      ${actorUserId},
      ${actorUserId}
    )
  `
  return (await getCampaignById(id))!
}

export async function updateCampaign(
  id: string,
  patch: Partial<{
    title: string
    channel: string
    theme: CommunicationsTheme
    status: OutreachCampaignStatus
    startDate: string | null
    endDate: string | null
    notes: string
  }>,
  actorUserId: string | null
): Promise<LroCampaign | null> {
  const existing = await getCampaignById(id)
  if (!existing) return null
  await ensureLroSchema()
  const sql = getSql()
  await sql`
    UPDATE lro_communications_campaigns SET
      title = ${patch.title ?? existing.title},
      channel = ${patch.channel ?? existing.channel},
      theme = ${patch.theme ?? existing.theme},
      status = ${patch.status ?? existing.status},
      start_date = ${patch.startDate !== undefined ? patch.startDate : existing.startDate},
      end_date = ${patch.endDate !== undefined ? patch.endDate : existing.endDate},
      notes = ${patch.notes ?? existing.notes},
      updated_by_user_id = ${actorUserId},
      updated_at = NOW()
    WHERE id = ${id}
  `
  return getCampaignById(id)
}

export async function listRegulations(category?: string): Promise<LroRegulationRef[]> {
  await ensureLroSchema()
  const sql = getSql()
  const rows = await sql`SELECT * FROM lro_regulation_refs ORDER BY category, title`
  let list = (rows as Record<string, unknown>[]).map(rowToRegulation)
  if (category && category !== 'all') {
    list = list.filter((r) => r.category === category)
  }
  return list
}

export async function getRegulationById(id: string): Promise<LroRegulationRef | null> {
  await ensureLroSchema()
  const sql = getSql()
  const rows = await sql`SELECT * FROM lro_regulation_refs WHERE id = ${id}`
  const row = (rows as Record<string, unknown>[])[0]
  return row ? rowToRegulation(row) : null
}

export async function createRegulation(
  input: {
    category: LroRegulationRef['category']
    title: string
    summary?: string
    externalUrl?: string | null
  },
  actorUserId: string | null
): Promise<LroRegulationRef> {
  await ensureLroSchema()
  const sql = getSql()
  const id = newId('lro-reg')
  await sql`
    INSERT INTO lro_regulation_refs (
      id, category, title, summary, external_url,
      created_by_user_id, updated_by_user_id
    ) VALUES (
      ${id},
      ${input.category},
      ${input.title.trim()},
      ${input.summary?.trim() ?? ''},
      ${input.externalUrl?.trim() || null},
      ${actorUserId},
      ${actorUserId}
    )
  `
  return (await getRegulationById(id))!
}

export async function updateRegulation(
  id: string,
  patch: Partial<{
    category: LroRegulationRef['category']
    title: string
    summary: string
    externalUrl: string | null
  }>,
  actorUserId: string | null
): Promise<LroRegulationRef | null> {
  const existing = await getRegulationById(id)
  if (!existing) return null
  await ensureLroSchema()
  const sql = getSql()
  await sql`
    UPDATE lro_regulation_refs SET
      category = ${patch.category ?? existing.category},
      title = ${patch.title ?? existing.title},
      summary = ${patch.summary ?? existing.summary},
      external_url = ${patch.externalUrl !== undefined ? patch.externalUrl : existing.externalUrl},
      updated_by_user_id = ${actorUserId},
      updated_at = NOW()
    WHERE id = ${id}
  `
  return getRegulationById(id)
}

export async function deleteRegulation(id: string): Promise<boolean> {
  await ensureLroSchema()
  const sql = getSql()
  const rows = await sql`DELETE FROM lro_regulation_refs WHERE id = ${id} RETURNING id`
  return (rows as unknown[]).length > 0
}

export async function getLroDashboardStats(): Promise<{
  openCases: number
  activeLegal: number
  activeComms: number
  regulationsCount: number
  casesByStatus: Record<string, number>
  mattersByStatus: Record<string, number>
  campaignsByStatus: Record<string, number>
}> {
  await ensureLroSchema()
  const [cases, matters, campaigns, regulations] = await Promise.all([
    listComplianceCases(),
    listLegalMatters(),
    listCampaigns(),
    listRegulations(),
  ])
  const casesByStatus: Record<string, number> = {}
  const mattersByStatus: Record<string, number> = {}
  const campaignsByStatus: Record<string, number> = {}
  for (const c of cases) {
    casesByStatus[c.status] = (casesByStatus[c.status] ?? 0) + 1
  }
  for (const m of matters) {
    mattersByStatus[m.status] = (mattersByStatus[m.status] ?? 0) + 1
  }
  for (const c of campaigns) {
    campaignsByStatus[c.status] = (campaignsByStatus[c.status] ?? 0) + 1
  }
  return {
    openCases: cases.filter((c) => c.status === 'open' || c.status === 'in_review').length,
    activeLegal: matters.filter((m) => m.status === 'active' || m.status === 'draft').length,
    activeComms: campaigns.filter((c) => c.status === 'active').length,
    regulationsCount: regulations.length,
    casesByStatus,
    mattersByStatus,
    campaignsByStatus,
  }
}

export function caseToJson(c: LroComplianceCase) {
  return { ...c }
}
export function matterToJson(m: LroLegalMatter) {
  return { ...m }
}
export function campaignToJson(c: LroCampaign) {
  return { ...c }
}
export function regulationToJson(r: LroRegulationRef) {
  return { ...r }
}
