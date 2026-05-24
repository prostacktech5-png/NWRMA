import { getSql } from '@/lib/db'
import { ensureHrSchema } from '@/lib/db/hr-schema'
import { appendHrAuditLog } from '@/lib/hr-audit-log'
import { getHrEmployeeById } from '@/lib/hr-employee-store'
import type {
  HrAssetAssignment,
  HrAssetCondition,
  HrAssetRecord,
  HrAssetStatus,
} from '@/lib/hr-types'

export function rowToHrAsset(r: Record<string, unknown>, custodianName?: string | null): HrAssetRecord {
  return {
    id: String(r.id),
    assetTag: String(r.asset_tag),
    name: String(r.name),
    category: String(r.category),
    serialNumber: r.serial_number != null ? String(r.serial_number) : null,
    condition: (String(r.condition ?? 'good') as HrAssetCondition) || 'good',
    warrantyExpiry: r.warranty_expiry != null ? new Date(String(r.warranty_expiry)) : null,
    location: String(r.location ?? ''),
    acquiredAt: r.acquired_at != null ? new Date(String(r.acquired_at)) : null,
    cost: r.cost != null ? Number(r.cost) : null,
    status: (String(r.status ?? 'in_storage') as HrAssetStatus) || 'in_storage',
    custodianEmployeeId: r.custodian_employee_id != null ? String(r.custodian_employee_id) : null,
    custodianName: custodianName ?? null,
    notes: String(r.notes ?? ''),
    createdAt: new Date(String(r.created_at)),
    updatedAt: new Date(String(r.updated_at)),
  }
}

async function custodianNameFor(id: string | null): Promise<string | null> {
  if (!id) return null
  const e = await getHrEmployeeById(id)
  return e?.fullName ?? null
}

export async function listHrAssets(): Promise<HrAssetRecord[]> {
  await ensureHrSchema()
  const sql = getSql()
  const rows = await sql`SELECT * FROM hr_assets ORDER BY name ASC`
  const out: HrAssetRecord[] = []
  for (const r of rows as Record<string, unknown>[]) {
    const cid = r.custodian_employee_id != null ? String(r.custodian_employee_id) : null
    const name = await custodianNameFor(cid)
    out.push(rowToHrAsset(r, name))
  }
  return out
}

export async function getHrAssetById(id: string): Promise<HrAssetRecord | null> {
  await ensureHrSchema()
  const sql = getSql()
  const rows = await sql`SELECT * FROM hr_assets WHERE id = ${id}`
  const row = (rows as Record<string, unknown>[])[0]
  if (!row) return null
  const cid = row.custodian_employee_id != null ? String(row.custodian_employee_id) : null
  return rowToHrAsset(row, await custodianNameFor(cid))
}

export type CreateHrAssetInput = {
  assetTag: string
  name: string
  category: string
  serialNumber?: string | null
  condition?: HrAssetCondition
  warrantyExpiry?: string | null
  location?: string
  acquiredAt?: string | null
  cost?: number | null
  notes?: string
}

export async function createHrAsset(
  input: CreateHrAssetInput,
  actorUserId: string | null
): Promise<HrAssetRecord> {
  await ensureHrSchema()
  const sql = getSql()
  const id = `ast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const now = new Date().toISOString()

  await sql`
    INSERT INTO hr_assets (
      id, asset_tag, name, category, serial_number, condition, warranty_expiry,
      location, acquired_at, cost, status, notes, created_at, updated_at
    ) VALUES (
      ${id},
      ${input.assetTag.trim()},
      ${input.name.trim()},
      ${input.category.trim()},
      ${input.serialNumber?.trim() ?? null},
      ${input.condition ?? 'good'},
      ${input.warrantyExpiry ?? null},
      ${input.location?.trim() ?? ''},
      ${input.acquiredAt ?? null},
      ${input.cost ?? null},
      ${'in_storage'},
      ${input.notes?.trim() ?? ''},
      ${now},
      ${now}
    )
  `

  await appendHrAuditLog({
    entityType: 'hr_asset',
    entityId: id,
    action: 'create',
    actorUserId,
    payload: { assetTag: input.assetTag },
  })

  const created = await getHrAssetById(id)
  if (!created) throw new Error('Failed to create asset.')
  return created
}

export async function updateHrAsset(
  id: string,
  patch: Partial<CreateHrAssetInput> & { status?: HrAssetStatus },
  actorUserId: string | null
): Promise<HrAssetRecord | null> {
  const existing = await getHrAssetById(id)
  if (!existing) return null
  await ensureHrSchema()
  const sql = getSql()
  const now = new Date().toISOString()

  await sql`
    UPDATE hr_assets SET
      asset_tag = ${patch.assetTag?.trim() ?? existing.assetTag},
      name = ${patch.name?.trim() ?? existing.name},
      category = ${patch.category?.trim() ?? existing.category},
      serial_number = ${patch.serialNumber !== undefined ? patch.serialNumber : existing.serialNumber},
      condition = ${patch.condition ?? existing.condition},
      warranty_expiry = ${
        patch.warrantyExpiry !== undefined
          ? patch.warrantyExpiry
          : existing.warrantyExpiry?.toISOString().slice(0, 10) ?? null
      },
      location = ${patch.location?.trim() ?? existing.location},
      acquired_at = ${
        patch.acquiredAt !== undefined
          ? patch.acquiredAt
          : existing.acquiredAt?.toISOString().slice(0, 10) ?? null
      },
      cost = ${patch.cost !== undefined ? patch.cost : existing.cost},
      status = ${patch.status ?? existing.status},
      notes = ${patch.notes?.trim() ?? existing.notes},
      updated_at = ${now}
    WHERE id = ${id}
  `

  await appendHrAuditLog({
    entityType: 'hr_asset',
    entityId: id,
    action: 'update',
    actorUserId,
  })

  return getHrAssetById(id)
}

export async function assignHrAsset(
  assetId: string,
  employeeId: string,
  notes: string,
  actorUserId: string | null
): Promise<HrAssetRecord | null> {
  const asset = await getHrAssetById(assetId)
  const employee = await getHrEmployeeById(employeeId)
  if (!asset || !employee) return null

  await ensureHrSchema()
  const sql = getSql()
  const assignmentId = `asgn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const now = new Date().toISOString()

  await sql`
    UPDATE hr_asset_assignments SET returned_at = ${now}
    WHERE asset_id = ${assetId} AND returned_at IS NULL
  `

  await sql`
    INSERT INTO hr_asset_assignments (
      id, asset_id, employee_id, assigned_at, notes, condition_at_assign
    ) VALUES (
      ${assignmentId},
      ${assetId},
      ${employeeId},
      ${now},
      ${notes},
      ${asset.condition}
    )
  `

  await sql`
    UPDATE hr_assets SET
      custodian_employee_id = ${employeeId},
      status = 'in_use',
      updated_at = ${now}
    WHERE id = ${assetId}
  `

  await appendHrAuditLog({
    entityType: 'hr_asset',
    entityId: assetId,
    action: 'assign',
    actorUserId,
    payload: { employeeId, employeeName: employee.fullName },
  })

  return getHrAssetById(assetId)
}

export async function returnHrAsset(
  assetId: string,
  notes: string,
  actorUserId: string | null
): Promise<HrAssetRecord | null> {
  const asset = await getHrAssetById(assetId)
  if (!asset) return null

  await ensureHrSchema()
  const sql = getSql()
  const now = new Date().toISOString()

  await sql`
    UPDATE hr_asset_assignments SET
      returned_at = ${now},
      notes = CASE WHEN notes = '' THEN ${notes} ELSE notes || ' | ' || ${notes} END
    WHERE asset_id = ${assetId} AND returned_at IS NULL
  `

  await sql`
    UPDATE hr_assets SET
      custodian_employee_id = NULL,
      status = 'in_storage',
      updated_at = ${now}
    WHERE id = ${assetId}
  `

  await appendHrAuditLog({
    entityType: 'hr_asset',
    entityId: assetId,
    action: 'return',
    actorUserId,
  })

  return getHrAssetById(assetId)
}

export async function listAssetAssignments(assetId: string): Promise<HrAssetAssignment[]> {
  await ensureHrSchema()
  const sql = getSql()
  const rows = await sql`
    SELECT a.*, e.full_name AS employee_name
    FROM hr_asset_assignments a
    LEFT JOIN hr_employees e ON e.id = a.employee_id
    WHERE a.asset_id = ${assetId}
    ORDER BY a.assigned_at DESC
  `
  return (rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    assetId: String(r.asset_id),
    employeeId: String(r.employee_id),
    employeeName: String(r.employee_name ?? ''),
    assignedAt: new Date(String(r.assigned_at)),
    returnedAt: r.returned_at != null ? new Date(String(r.returned_at)) : null,
    notes: String(r.notes ?? ''),
    conditionAtAssign: r.condition_at_assign != null ? String(r.condition_at_assign) : null,
    conditionAtReturn: r.condition_at_return != null ? String(r.condition_at_return) : null,
  }))
}

export function hrAssetToJson(a: HrAssetRecord) {
  return {
    ...a,
    warrantyExpiry: a.warrantyExpiry?.toISOString().slice(0, 10) ?? null,
    acquiredAt: a.acquiredAt?.toISOString().slice(0, 10) ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }
}
