import { randomUUID } from 'crypto'
import { getSql, isPostgresUndefinedRelationError } from '@/lib/db'
import { loadOrSeedErpReferencePayload, saveErpReferencePayload } from '@/lib/db/reference-data-persistence'
import type { BoreholeLicenseApplication, LicenseApplicationStatus } from '@/lib/types'

export type DbLicenseApplication = {
  id: string
  reference: string
  status: LicenseApplicationStatus
  applicantName: string
  applicantEmail: string
  organisationName: string
  companyName: string
  district: string
  paymentStatus: string
  submittedAt: string | null
  approvedAt: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

function rowToLicense(r: Record<string, unknown>): DbLicenseApplication {
  return {
    id: String(r.id),
    reference: String(r.reference),
    status: String(r.status) as LicenseApplicationStatus,
    applicantName: String(r.applicant_name ?? ''),
    applicantEmail: String(r.applicant_email ?? ''),
    organisationName: String(r.organisation_name ?? ''),
    companyName: String(r.company_name ?? ''),
    district: String(r.district ?? ''),
    paymentStatus: String(r.payment_status ?? 'unpaid'),
    submittedAt: r.submitted_at ? new Date(String(r.submitted_at)).toISOString() : null,
    approvedAt: r.approved_at ? new Date(String(r.approved_at)).toISOString() : null,
    expiresAt: r.expires_at ? new Date(String(r.expires_at)).toISOString() : null,
    createdAt: new Date(String(r.created_at)).toISOString(),
    updatedAt: new Date(String(r.updated_at)).toISOString(),
  }
}

function erpAppToRow(app: BoreholeLicenseApplication) {
  return {
    id: app.id,
    reference: app.reference,
    status: app.status,
    applicant_name: app.applicantName,
    applicant_email: app.applicantEmail,
    organisation_name: app.organisationName,
    company_name: app.companyName,
    district: app.district,
    payment_status: app.paymentStatus ?? 'unpaid',
    submitted_at: app.submittedAt ? new Date(app.submittedAt) : null,
    approved_at: app.approvedAt ? new Date(app.approvedAt) : null,
    expires_at: app.licenseExpiry ? new Date(app.licenseExpiry) : null,
    payload: app,
  }
}

/** Upsert license_applications rows from ERP snapshot for reporting and super-admin lists. */
export async function syncLicenseApplicationsFromErp(): Promise<number> {
  const payload = await loadOrSeedErpReferencePayload()
  const apps = payload.licenseApplications ?? []
  if (!apps.length) return 0

  const sql = getSql()
  let synced = 0
  for (const app of apps) {
    const row = erpAppToRow(app)
    try {
      await sql`
        INSERT INTO license_applications (
          id, reference, status, applicant_name, applicant_email, organisation_name,
          company_name, district, payment_status, payload, submitted_at, approved_at, expires_at
        ) VALUES (
          ${row.id}, ${row.reference}, ${row.status}, ${row.applicant_name},
          ${row.applicant_email}, ${row.organisation_name}, ${row.company_name},
          ${row.district}, ${row.payment_status}, ${JSON.stringify(row.payload)},
          ${row.submitted_at}, ${row.approved_at}, ${row.expires_at}
        )
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          applicant_name = EXCLUDED.applicant_name,
          applicant_email = EXCLUDED.applicant_email,
          organisation_name = EXCLUDED.organisation_name,
          company_name = EXCLUDED.company_name,
          district = EXCLUDED.district,
          payment_status = EXCLUDED.payment_status,
          payload = EXCLUDED.payload,
          submitted_at = EXCLUDED.submitted_at,
          approved_at = EXCLUDED.approved_at,
          expires_at = EXCLUDED.expires_at,
          updated_at = now()
      `
      synced++
    } catch (e) {
      if (isPostgresUndefinedRelationError(e)) return 0
      throw e
    }
  }
  return synced
}

export async function listLicenseApplications(opts?: {
  status?: string
  district?: string
  search?: string
  limit?: number
  offset?: number
}): Promise<{ items: DbLicenseApplication[]; total: number }> {
  await syncLicenseApplicationsFromErp()
  const sql = getSql()
  const limit = opts?.limit ?? 100
  const offset = opts?.offset ?? 0

  try {
    let rows: Record<string, unknown>[]
    let countRows: { c: number }[]

    if (opts?.status) {
      countRows = (await sql`
        SELECT COUNT(*)::int AS c FROM license_applications
        WHERE deleted_at IS NULL AND status = ${opts.status}
      `) as { c: number }[]
      rows = (await sql`
        SELECT * FROM license_applications
        WHERE deleted_at IS NULL AND status = ${opts.status}
        ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
      `) as Record<string, unknown>[]
    } else {
      countRows = (await sql`
        SELECT COUNT(*)::int AS c FROM license_applications WHERE deleted_at IS NULL
      `) as { c: number }[]
      rows = (await sql`
        SELECT * FROM license_applications
        WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
      `) as Record<string, unknown>[]
    }

    return {
      items: rows.map((r) => rowToLicense(r)),
      total: Number(countRows[0]?.c ?? 0),
    }
  } catch (e) {
    if (!isPostgresUndefinedRelationError(e)) throw e
    const payload = await loadOrSeedErpReferencePayload()
    let apps = payload.licenseApplications ?? []
    if (opts?.status) apps = apps.filter((a) => a.status === opts.status)
    if (opts?.search) {
      const q = opts.search.toLowerCase()
      apps = apps.filter(
        (a) =>
          a.reference.toLowerCase().includes(q) ||
          a.companyName.toLowerCase().includes(q)
      )
    }
    const slice = apps.slice(offset, offset + limit)
    return {
      items: slice.map((a) => ({
        id: a.id,
        reference: a.reference,
        status: a.status,
        applicantName: a.applicantName,
        applicantEmail: a.applicantEmail,
        organisationName: a.organisationName,
        companyName: a.companyName,
        district: a.district,
        paymentStatus: a.paymentStatus ?? 'unpaid',
        submittedAt: a.submittedAt ? new Date(a.submittedAt).toISOString() : null,
        approvedAt: a.approvedAt ? new Date(a.approvedAt).toISOString() : null,
        expiresAt: a.licenseExpiry ? new Date(a.licenseExpiry).toISOString() : null,
        createdAt: new Date(a.submittedAt).toISOString(),
        updatedAt: new Date(a.submittedAt).toISOString(),
      })),
      total: apps.length,
    }
  }
}

export async function updateLicenseApplicationStatus(
  id: string,
  status: LicenseApplicationStatus,
  actorId?: string | null
): Promise<boolean> {
  const sql = getSql()
  try {
    await sql`
      UPDATE license_applications SET status = ${status}, updated_at = now() WHERE id = ${id}
    `
    await sql`
      INSERT INTO license_workflow_events (id, application_id, to_status, actor_id)
      VALUES (${randomUUID()}, ${id}, ${status}, ${actorId ?? null})
    `
  } catch (e) {
    if (!isPostgresUndefinedRelationError(e)) throw e
    const payload = await loadOrSeedErpReferencePayload()
    const idx = payload.licenseApplications.findIndex((a) => a.id === id)
    if (idx < 0) return false
    payload.licenseApplications[idx] = {
      ...payload.licenseApplications[idx],
      status,
    }
    await saveErpReferencePayload(payload)
    return true
  }
  return true
}
