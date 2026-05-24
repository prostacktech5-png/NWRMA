/// Rules for departmental programme requisitions in the Finance store (`FinanceApiStore`).
/** Inclusive ceiling after HoD: amounts here or below bypass HR/Admin/DG (petty queue at Finance); above use full chain: HR & Admin, DG, then Finance. */
export const PETTY_CASH_MAX_AMOUNT_SLE = 500

export type FinanceRequisitionRouteKey = 'petty_cash_direct' | 'full_chain'

export function usesPettyCashDirectRouting(row: {
  amount: number
  approvalRoute: string | null
}): boolean {
  if ((row.approvalRoute ?? '').trim() === 'petty_cash_direct') return true
  return row.amount > 0 && row.amount <= PETTY_CASH_MAX_AMOUNT_SLE
}

export function resolveFinanceRequisitionRoute(amount: number): FinanceRequisitionRouteKey {
  return amount <= PETTY_CASH_MAX_AMOUNT_SLE ? 'petty_cash_direct' : 'full_chain'
}

export function financeRequisitionProgressStages(read: {
  amount: number
  approvalRoute: string | null
}): readonly string[] {
  if (usesPettyCashDirectRouting(read)) {
    return ['hod_review', 'finance_review', 'approved'] as const
  }
  return ['hod_review', 'admin_review', 'dg_review', 'finance_review', 'approved'] as const
}

export function financeRequisitionStageIndex(status: string, stages: readonly string[]): number {
  if (status === 'approved') return stages.length - 1
  const i = stages.indexOf(status)
  return Math.max(0, i)
}
