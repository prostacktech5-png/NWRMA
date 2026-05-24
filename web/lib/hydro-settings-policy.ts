import { canManageOrgSettings } from '@/lib/settings-access-policy'
import type { User } from '@/lib/types'

/** Matches ERP `requireHydrologicalHODOrAdmin` for hydrological programme settings (client-safe). */
export function canManageHydrologicalSettings(user: User): boolean {
  return user.role === 'hod' && user.department === 'hydrological'
}

/** Public procurement / per-diem URL rotation — org settings managers (admin or HR & Admin HoD). */
export function canManagePublicHydroPortalLinks(user: User): boolean {
  return canManageOrgSettings(user)
}
