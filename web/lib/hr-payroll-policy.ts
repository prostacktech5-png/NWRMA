import { isOrgWideRole } from '@/lib/department-scope'
import type { User } from '@/lib/types'
import type { HrPayrollRunStatus } from '@/lib/hr-types'

export function canSubmitPayroll(user: User, status: HrPayrollRunStatus): boolean {
  if (status !== 'draft') return false
  return user.department === 'hr'
}

export function canHrApprovePayroll(user: User, status: HrPayrollRunStatus): boolean {
  if (status !== 'submitted') return false
  return user.department === 'hr'
}

export function canFinanceApprovePayroll(user: User, status: HrPayrollRunStatus): boolean {
  if (status !== 'hr_approved') return false
  return user.department === 'financial' || isOrgWideRole(user)
}

export function canDisbursePayroll(user: User, status: HrPayrollRunStatus): boolean {
  if (status !== 'finance_approved') return false
  return user.department === 'financial' || isOrgWideRole(user)
}

export function canRejectPayroll(user: User, status: HrPayrollRunStatus): boolean {
  if (status === 'draft' || status === 'disbursed' || status === 'rejected') return false
  if (status === 'submitted') return user.department === 'hr'
  if (status === 'hr_approved' || status === 'finance_approved') {
    return (
      user.department === 'financial' ||
      user.department === 'hr' ||
      isOrgWideRole(user)
    )
  }
  return false
}
