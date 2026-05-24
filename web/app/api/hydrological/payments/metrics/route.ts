import { tryRespondWithDbSetupHint } from '@/lib/db'
import { loadOrSeedErpReferencePayload } from '@/lib/db/reference-data-persistence'
import { filterFinanceBudgetsForDepartment, getFinanceApiStore, type FinanceBudget } from '@/lib/finance-api-store'
import { getHydroPaymentStore } from '@/lib/hydro-payment-store'

function financeHydroLinesToMetricsShape(budgets: FinanceBudget[]) {
  return budgets.map((b) => ({
    id: String(b.id),
    programmeCode: b.budgetCode,
    programmeName: b.project,
    allocatedAmount: b.totalAmount,
    utilizedAmount: b.utilizedAmount,
    currency: 'SLE',
  }))
}

/** Programme budget lines for hydrological department (existing endpoint shape for UI) */
export async function GET() {
  return tryRespondWithDbSetupHint(async () => {
    const store = await getHydroPaymentStore()
    const ref = await loadOrSeedErpReferencePayload()
    const refHydro = ref.programmeBudgetLines.filter((l) => l.department === 'hydrological')

    const financeStore = await getFinanceApiStore()
    const fromFinance = filterFinanceBudgetsForDepartment(financeStore.budgets, 'hydrological')
    const hydroBudgetLines =
      fromFinance.length > 0 ? financeHydroLinesToMetricsShape(fromFinance) : refHydro

    const paidOut = store.payments
      .filter((p) => p.status === 'disbursed')
      .reduce((s, p) => s + p.totalSle, 0)
    const accruedApproved = store.payments
      .filter((p) => p.status === 'approved')
      .reduce((s, p) => s + p.totalSle, 0)

    return Response.json({
      paymentsSummary: store.metrics(),
      hydroBudgetLines,
      paidIncentivesDisbursedSle: paidOut,
      paidIncentivesApprovedAwaitingDisbursementSle: accruedApproved,
    })
  })
}
