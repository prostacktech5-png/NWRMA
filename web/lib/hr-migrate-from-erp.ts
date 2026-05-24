import { loadOrSeedErpReferencePayload } from '@/lib/db/reference-data-persistence'
import { assets as seedAssets } from '@/lib/seed-demo-payloads'
import { ensureHrSchema } from '@/lib/db/hr-schema'
import { getSql } from '@/lib/db'
import { appendHrAuditLog } from '@/lib/hr-audit-log'
import type { Department } from '@/lib/types'

const META_KEY = 'hr_erp_import_done'

function mapStatus(s: string): 'active' | 'on_leave' | 'terminated' | 'archived' {
  if (s === 'on_leave') return 'on_leave'
  if (s === 'terminated') return 'terminated'
  return 'active'
}

export async function importHrEmployeesFromErpIfEmpty(): Promise<{ imported: number }> {
  await ensureHrSchema()
  const sql = getSql()
  const meta = await sql`SELECT value FROM app_meta WHERE key = ${META_KEY}`
  if ((meta as { value?: string }[])[0]?.value === '1') {
    return { imported: 0 }
  }

  const countRows = await sql`SELECT COUNT(*)::int AS c FROM hr_employees`
  const existing = Number((countRows[0] as { c: number }).c ?? 0)
  if (existing > 0) {
    await sql`
      INSERT INTO app_meta (key, value) VALUES (${META_KEY}, '1')
      ON CONFLICT (key) DO UPDATE SET value = '1'
    `
    return { imported: 0 }
  }

  const erp = await loadOrSeedErpReferencePayload()
  let imported = 0
  for (const e of erp.employees) {
    const id = e.id.startsWith('emp-') ? e.id : `emp-${e.id}`
    const dept = e.department as Department | null
    const employeeNumber =
      id.replace(/^emp-/, 'NWRMA-').toUpperCase().slice(0, 20) || `NWRMA-${Date.now()}`
    await sql`
      INSERT INTO hr_employees (
        id, employee_number, user_id, full_name, department, role_title,
        employment_type, phone, email, employment_status, hired_at, created_at, updated_at
      ) VALUES (
        ${id},
        ${employeeNumber},
        ${e.userId},
        ${e.fullName},
        ${dept},
        ${e.title},
        ${'employee'},
        ${e.phone},
        ${e.email},
        ${mapStatus(e.status)},
        ${e.hiredAt.toISOString().slice(0, 10)},
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO NOTHING
    `
    imported++
  }

  for (const a of seedAssets) {
    const assetId = a.id.startsWith('ast-') ? a.id : `ast-${a.id}`
    await sql`
      INSERT INTO hr_assets (
        id, asset_tag, name, category, location, acquired_at, cost, status,
        custodian_employee_id, created_at, updated_at
      ) VALUES (
        ${assetId},
        ${a.tag},
        ${a.name},
        ${a.category},
        ${a.location},
        ${a.acquiredAt.toISOString().slice(0, 10)},
        ${a.cost},
        ${a.status},
        ${a.custodianEmployeeId},
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO NOTHING
    `
  }

  await sql`
    INSERT INTO app_meta (key, value) VALUES (${META_KEY}, '1')
    ON CONFLICT (key) DO UPDATE SET value = '1'
  `

  if (imported > 0) {
    await appendHrAuditLog({
      entityType: 'hr_employees',
      entityId: 'bulk',
      action: 'erp_import',
      actorUserId: null,
      payload: { count: imported },
    })
  }

  return { imported }
}
