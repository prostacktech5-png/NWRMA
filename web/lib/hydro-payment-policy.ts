import type { User } from '@/lib/types'

/** Bulk submit pending gauge officer payments to the DG queue — Finance HoD or administrator only. */
export function canBulkSubmitHydroPaymentsToDg(user: User): boolean {
  return user.role === 'admin' || (user.role === 'hod' && user.department === 'financial')
}

/** Approve payments submitted to DG — Director General or administrator only (not Hydrological HoD). */
export function canApproveHydroPaymentsAsDg(user: User): boolean {
  return user.role === 'admin' || user.role === 'dg'
}

/** Record disbursement after DG approval — Finance department, DG, or administrator. */
export function canDisburseHydroPayments(user: User): boolean {
  if (user.role === 'dg') return true
  return user.department === 'financial' && (user.role === 'hod' || user.role === 'staff')
}
