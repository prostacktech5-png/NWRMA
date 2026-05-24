export interface DeptStat {
  department: string
  allocated: number
  utilized: number
  availableBalance: number
  utilizationRate: number
  requisitionsCount: number
  requisitionsTotal: number
  pendingCount: number
  pendingAmount: number
}

export interface BudgetLine {
  id: number
  department: string
  project: string
  source: string
  totalAmount: number
  utilizedAmount: number
  availableBalance: number
  fiscalYear: string
}

export interface BudgetOverview {
  departments: DeptStat[]
  totalAllocated: number
  totalUtilized: number
  totalAvailable: number
  utilizationRate: number
  budgets: BudgetLine[]
}
