import { getSql } from '@/lib/db'
import { ensureHrSchema } from '@/lib/db/hr-schema'
import { appendHrAuditLog } from '@/lib/hr-audit-log'
import type {
  HrEmergencyContact,
  HrEmployeeRecord,
  HrEmploymentStatus,
  HrEmploymentType,
} from '@/lib/hr-types'
import type { Department } from '@/lib/types'

function parseEmergency(raw: unknown): HrEmergencyContact | null {
  if (raw == null) return null
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>
    const name = String(o.name ?? '').trim()
    const phone = String(o.phone ?? '').trim()
    if (!name && !phone) return null
    return {
      name,
      phone,
      relationship: o.relationship != null ? String(o.relationship) : undefined,
    }
  }
  return null
}

export function rowToHrEmployee(r: Record<string, unknown>): HrEmployeeRecord {
  const deptRaw = r.department != null ? String(r.department).trim().toLowerCase() : ''
  const validDept = [
    'hydrological',
    'boreholes',
    'financial',
    'hr',
    'compliance',
  ].includes(
    deptRaw
  )
    ? (deptRaw as NonNullable<Department>)
    : null

  return {
    id: String(r.id),
    employeeNumber: String(r.employee_number),
    userId: r.user_id != null ? String(r.user_id) : null,
    fullName: String(r.full_name),
    department: validDept,
    roleTitle: String(r.role_title ?? ''),
    employmentType: (String(r.employment_type ?? 'employee') as HrEmploymentType) || 'employee',
    phone: String(r.phone ?? ''),
    email: String(r.email ?? ''),
    dateOfBirth: r.date_of_birth != null ? new Date(String(r.date_of_birth)) : null,
    employmentStatus: String(r.employment_status ?? 'active') as HrEmploymentStatus,
    salaryAmount: r.salary_amount != null ? Number(r.salary_amount) : null,
    salaryCurrency: String(r.salary_currency ?? 'SLE'),
    stipendAmount: r.stipend_amount != null ? Number(r.stipend_amount) : null,
    emergencyContact: parseEmergency(r.emergency_contact),
    nationalId: r.national_id != null ? String(r.national_id) : null,
    profileImageUrl: r.profile_image_url != null ? String(r.profile_image_url) : null,
    hiredAt: r.hired_at != null ? new Date(String(r.hired_at)) : null,
    archivedAt: r.archived_at != null ? new Date(String(r.archived_at)) : null,
    createdAt: new Date(String(r.created_at)),
    updatedAt: new Date(String(r.updated_at)),
  }
}

export async function listHrEmployees(opts?: {
  includeArchived?: boolean
  search?: string
}): Promise<HrEmployeeRecord[]> {
  await ensureHrSchema()
  const sql = getSql()
  const rows = await sql`
    SELECT * FROM hr_employees
    ORDER BY full_name ASC
  `
  let list = (rows as Record<string, unknown>[]).map(rowToHrEmployee)
  if (!opts?.includeArchived) {
    list = list.filter((e) => e.employmentStatus !== 'archived' && !e.archivedAt)
  }
  const q = opts?.search?.trim().toLowerCase()
  if (q) {
    list = list.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.employeeNumber.toLowerCase().includes(q) ||
        e.roleTitle.toLowerCase().includes(q)
    )
  }
  return list
}

export async function getHrEmployeeById(id: string): Promise<HrEmployeeRecord | null> {
  await ensureHrSchema()
  const sql = getSql()
  const rows = await sql`SELECT * FROM hr_employees WHERE id = ${id}`
  const row = (rows as Record<string, unknown>[])[0]
  return row ? rowToHrEmployee(row) : null
}

export async function nextEmployeeNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `NWRMA-${year}-`
  const list = await listHrEmployees({ includeArchived: true })
  let max = 0
  for (const e of list) {
    if (!e.employeeNumber.startsWith(prefix)) continue
    const n = parseInt(e.employeeNumber.slice(prefix.length), 10)
    if (Number.isFinite(n) && n > max) max = n
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`
}

export type CreateHrEmployeeInput = {
  fullName: string
  department: Department
  roleTitle: string
  employmentType?: HrEmploymentType
  phone?: string
  email?: string
  dateOfBirth?: string | null
  employmentStatus?: HrEmploymentStatus
  salaryAmount?: number | null
  stipendAmount?: number | null
  emergencyContact?: HrEmergencyContact | null
  nationalId?: string | null
  profileImageUrl?: string | null
  hiredAt?: string | null
  userId?: string | null
}

export async function createHrEmployee(
  input: CreateHrEmployeeInput,
  actorUserId: string | null
): Promise<HrEmployeeRecord> {
  await ensureHrSchema()
  const sql = getSql()
  const id = `emp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const employeeNumber = await nextEmployeeNumber()
  const now = new Date()

  await sql`
    INSERT INTO hr_employees (
      id, employee_number, user_id, full_name, department, role_title,
      employment_type, phone, email, date_of_birth, employment_status,
      salary_amount, salary_currency, stipend_amount, emergency_contact,
      national_id, profile_image_url, hired_at, created_at, updated_at
    ) VALUES (
      ${id},
      ${employeeNumber},
      ${input.userId ?? null},
      ${input.fullName.trim()},
      ${input.department},
      ${input.roleTitle.trim()},
      ${input.employmentType ?? 'employee'},
      ${input.phone?.trim() ?? ''},
      ${input.email?.trim() ?? ''},
      ${input.dateOfBirth ?? null},
      ${input.employmentStatus ?? 'active'},
      ${input.salaryAmount ?? null},
      ${'SLE'},
      ${input.stipendAmount ?? null},
      ${input.emergencyContact != null ? JSON.stringify(input.emergencyContact) : null},
      ${input.nationalId?.trim() ?? null},
      ${input.profileImageUrl?.trim() ?? null},
      ${input.hiredAt ?? now.toISOString().slice(0, 10)},
      ${now.toISOString()},
      ${now.toISOString()}
    )
  `

  await appendHrAuditLog({
    entityType: 'hr_employee',
    entityId: id,
    action: 'create',
    actorUserId,
    payload: { employeeNumber, fullName: input.fullName },
  })

  const created = await getHrEmployeeById(id)
  if (!created) throw new Error('Failed to create employee.')
  return created
}

export async function updateHrEmployee(
  id: string,
  patch: Partial<CreateHrEmployeeInput>,
  actorUserId: string | null
): Promise<HrEmployeeRecord | null> {
  const existing = await getHrEmployeeById(id)
  if (!existing) return null

  await ensureHrSchema()
  const sql = getSql()
  const now = new Date().toISOString()

  await sql`
    UPDATE hr_employees SET
      full_name = ${patch.fullName?.trim() ?? existing.fullName},
      department = ${patch.department ?? existing.department},
      role_title = ${patch.roleTitle?.trim() ?? existing.roleTitle},
      employment_type = ${patch.employmentType ?? existing.employmentType},
      phone = ${patch.phone?.trim() ?? existing.phone},
      email = ${patch.email?.trim() ?? existing.email},
      date_of_birth = ${
        patch.dateOfBirth !== undefined
          ? patch.dateOfBirth
          : existing.dateOfBirth?.toISOString().slice(0, 10) ?? null
      },
      employment_status = ${patch.employmentStatus ?? existing.employmentStatus},
      salary_amount = ${patch.salaryAmount !== undefined ? patch.salaryAmount : existing.salaryAmount},
      stipend_amount = ${
        patch.stipendAmount !== undefined ? patch.stipendAmount : existing.stipendAmount
      },
      emergency_contact = ${
        patch.emergencyContact !== undefined
          ? patch.emergencyContact != null
            ? JSON.stringify(patch.emergencyContact)
            : null
          : existing.emergencyContact != null
            ? JSON.stringify(existing.emergencyContact)
            : null
      },
      national_id = ${patch.nationalId !== undefined ? patch.nationalId : existing.nationalId},
      profile_image_url = ${
        patch.profileImageUrl !== undefined ? patch.profileImageUrl : existing.profileImageUrl
      },
      hired_at = ${
        patch.hiredAt !== undefined
          ? patch.hiredAt
          : existing.hiredAt?.toISOString().slice(0, 10) ?? null
      },
      user_id = ${patch.userId !== undefined ? patch.userId : existing.userId},
      updated_at = ${now}
    WHERE id = ${id}
  `

  await appendHrAuditLog({
    entityType: 'hr_employee',
    entityId: id,
    action: 'update',
    actorUserId,
    payload: patch as Record<string, unknown>,
  })

  return getHrEmployeeById(id)
}

export async function archiveHrEmployee(
  id: string,
  actorUserId: string | null
): Promise<HrEmployeeRecord | null> {
  const existing = await getHrEmployeeById(id)
  if (!existing) return null
  await ensureHrSchema()
  const sql = getSql()
  const now = new Date().toISOString()
  await sql`
    UPDATE hr_employees SET
      employment_status = 'archived',
      archived_at = ${now},
      updated_at = ${now}
    WHERE id = ${id}
  `
  await appendHrAuditLog({
    entityType: 'hr_employee',
    entityId: id,
    action: 'archive',
    actorUserId,
  })
  return getHrEmployeeById(id)
}

export function hrEmployeeToJson(e: HrEmployeeRecord) {
  return {
    ...e,
    dateOfBirth: e.dateOfBirth?.toISOString().slice(0, 10) ?? null,
    hiredAt: e.hiredAt?.toISOString().slice(0, 10) ?? null,
    archivedAt: e.archivedAt?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }
}
