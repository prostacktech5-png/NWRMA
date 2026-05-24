import type { User } from '@/lib/types'
import { financeBudgetDepartmentMatches } from '@/lib/orgDepartments'

/**
 * HoD first for every programme requisition.
 * Settlement roles follow store routing (`finance-requisition-routing` + `FinanceApiStore.applyRequisitionDecision`).
 * Admin gate: HR and Finance departments may approve the shared `admin_review` step (organisation: HR & Admin).
 */
export function canDecideFinanceRequisition(
  viewer: User,
  row: { status: string; department: string }
): boolean {

  if (row.status === 'hod_review') {
    if (viewer.role !== 'hod' || viewer.department == null) return false
    return financeBudgetDepartmentMatches(row.department, viewer.department)
  }

  if (row.status === 'admin_review') {
    if (viewer.department !== 'financial' && viewer.department !== 'hr') return false
    return viewer.role === 'hod' || viewer.role === 'staff'
  }

  if (row.status === 'dg_review') {
    return viewer.role === 'dg'
  }

  if (row.status === 'finance_review') {
    if (viewer.department !== 'financial') return false
    return viewer.role === 'hod' || viewer.role === 'staff'
  }

  return false
}
