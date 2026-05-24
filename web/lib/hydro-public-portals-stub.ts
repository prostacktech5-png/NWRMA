export type HydroPublicProgrammeBudgetInfo = {
  code: string
  budgetId: number
  label: string
  project: string
  fiscalYear: string
  availableBalance: number
  pendingCommittedInApprovalPipeline?: number
}

/** Demo programme line so the public form works after generating a link (no Finance integration yet). */
export function getDemoHydrologicalProgrammeBudget(): HydroPublicProgrammeBudgetInfo {
  return {
    code: 'HYD-PROC-01',
    budgetId: 1,
    label: 'Hydrological — field operations & procurement',
    project: 'Vote line — Hydrological Department',
    fiscalYear: '2025/26',
    availableBalance: 125_000,
    pendingCommittedInApprovalPipeline: 8_500,
  }
}

export type HydroPublicPortalHodWorkflow = 'pending_hod' | 'released'

export type StoredPublicRequisition = {
  id: number
  kind: 'staff' | 'per_diem'
  token: string
  title: string
  description: string
  requestedBy: string
  requesterEmail: string
  amount: number
  department: string
  budgetCode: string
  createdAt: string
  hodWorkflow?: HydroPublicPortalHodWorkflow
}

/** Legacy rows without `hodWorkflow` are treated as already released. */
export function normalizePublicReqHodWorkflow(r: StoredPublicRequisition): HydroPublicPortalHodWorkflow {
  return r.hodWorkflow ?? 'released'
}
