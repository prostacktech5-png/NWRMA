import { isOrgWideRole } from '@/lib/department-scope'
import { isHrAdminDepartmentManager } from '@/lib/settings-access-policy'
import type { User } from '@/lib/types'

export type HrCapability =
  | 'view_hr_hub'
  | 'manage_employees'
  | 'view_employees'
  | 'manage_assets'
  | 'view_assets'
  | 'manage_leave'
  | 'decide_leave_hod'
  | 'create_leave'
  | 'manage_payroll'
  | 'view_payroll'
  | 'approve_payroll_finance'
  | 'manage_subscriptions'
  | 'view_subscriptions'

export function resolveHrRole(user: User): string {
  if (user.role === 'dg') return 'executive_viewer'
  if (user.department === 'hr' && user.role === 'hod') return 'hr_admin'
  if (user.department === 'hr') return 'hr_admin'
  return 'none'
}

export function canHr(user: User, cap: HrCapability): boolean {
  const hrRole = resolveHrRole(user)
  if (hrRole === 'none' && !isOrgWideRole(user)) return false

  if (isHrAdminDepartmentManager(user) || (user.department === 'hr' && hrRole === 'hr_admin')) {
    return true
  }

  if (user.role === 'dg') {
    return (
      cap === 'view_hr_hub' ||
      cap === 'view_employees' ||
      cap === 'view_assets' ||
      cap === 'view_payroll' ||
      cap === 'view_subscriptions'
    )
  }

  if (user.department === 'financial') {
    if (cap === 'approve_payroll_finance' || cap === 'view_payroll') return true
    if (cap === 'view_hr_hub' || cap === 'view_subscriptions') return true
    return false
  }

  if (hrRole === 'hr_admin') {
    return cap !== 'decide_leave_hod' || user.role === 'hod'
  }

  return false
}

export function canAccessHrModule(user: User): boolean {
  return isOrgWideRole(user) || user.department === 'hr'
}
