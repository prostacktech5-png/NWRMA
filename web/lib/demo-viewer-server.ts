import { isAccountExpired, parseAccountExpiresAt } from '@/lib/account-expiry'
import { resolveActingUserIdFromRequest } from '@/lib/demo-acting-user'
import { getRecordById } from '@/lib/local-password-store'
import { normalizeErpDepartmentKey } from '@/lib/hydrological-services-merge'
import type { Department, HydroNavAccess, Role, User } from '@/lib/types'

const DEPTS = new Set<string>([
  'hydrological',
  'boreholes',
  'financial',
  'hr',
  'compliance',
])

function isRole(r: string): r is Role {
  return r === 'admin' || r === 'dg' || r === 'hod' || r === 'staff'
}

function normalizeDepartment(role: Role, raw: string | null): Department {
  if (role !== 'hod' && role !== 'staff') return null
  const key = normalizeErpDepartmentKey(raw)
  if (!key || !DEPTS.has(key)) return null
  return key
}

function userFromStoreRecord(rec: {
  id: string
  email: string
  fullName: string
  role: string
  department: string | null
  hydroNavAccess: HydroNavAccess | null
  updatedAt: string
}): User | null {
  const roleNorm = rec.role.trim().toLowerCase()
  if (!isRole(roleNorm)) return null
  const department =
    roleNorm === 'dg' || roleNorm === 'admin'
      ? null
      : normalizeDepartment(roleNorm, rec.department)
  if ((roleNorm === 'hod' || roleNorm === 'staff') && !department) return null
  return {
    id: rec.id,
    email: rec.email,
    name: rec.fullName,
    role: roleNorm,
    department,
    status: 'active',
    createdAt: new Date(rec.updatedAt),
    hydroNavAccess: rec.hydroNavAccess,
  }
}

export async function resolveDemoViewerFromRequest(req: Request): Promise<User | null> {
  const userId = await resolveActingUserIdFromRequest(req)
  if (!userId) return null
  const rec = await getRecordById(userId)
  if (!rec) return null
  const expiresAt = parseAccountExpiresAt(rec.accountExpiresAt)
  if (isAccountExpired(expiresAt)) return null
  return userFromStoreRecord(rec)
}
