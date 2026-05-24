import type { Role, Department, User, HydroNavAccess } from '@/lib/types'

/** Mirrors the ERP admin users API row you can wire to Prisma later. */
export interface AdminUser {
  id: string
  username: string
  email: string
  fullName: string
  role: Role
  department: Department
  isActive: boolean
  createdAt: Date
  pendingPasswordSetup: boolean
  inviteExpired: boolean
  /** Hydrological staff — fine-grained module access; ignored for other roles / departments. */
  hydroNavAccess: HydroNavAccess | null
}

export function allocateUsernameFromEmail(email: string): string {
  const localRaw = email.split('@')[0] ?? 'user'
  let base = localRaw.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (base.length < 3) {
    base = `${base}usr`.slice(0, Math.max(3, base.length + 3))
    if (base.length < 3) base = 'erpuser'
  }
  return base
}

export function mapDirectoryUserToAdminUser(u: User): AdminUser {
  const hydroNavAccess =
    u.role === 'staff' && u.department === 'hydrological' ? (u.hydroNavAccess ?? null) : null
  const createdAt =
    u.createdAt instanceof Date
      ? u.createdAt
      : new Date(String(u.createdAt ?? ''))
  const created =
    Number.isNaN(createdAt.getTime()) ? new Date() : createdAt
  return {
    id: u.id,
    username: allocateUsernameFromEmail(u.email),
    email: u.email,
    fullName: u.name,
    role: u.role,
    department: u.department,
    isActive: u.status === 'active',
    createdAt: created,
    pendingPasswordSetup: u.pendingPasswordSetup === true,
    inviteExpired: u.inviteExpired === true,
    hydroNavAccess,
  }
}

/** Live users come from `/api/users/directory` — no bundled demo rows. */
export function createInitialAdminUsers(): AdminUser[] {
  return []
}

export const VALID_ROLES: Role[] = ['admin', 'hod', 'dg', 'staff']

export const VALID_DEPARTMENTS = [
  'hydrological',
  'boreholes',
  'financial',
  'hr',
  'compliance',
] as const satisfies readonly Exclude<Department, null>[]
