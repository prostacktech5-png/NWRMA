import { getFinanceApiStore } from '@/lib/finance-api-store'

export async function GET() {
  const store = await getFinanceApiStore()
  const budgets = store.budgets
  const requisitions = store.requisitions

  const totalAllocated = budgets.reduce((sum, b) => sum + b.totalAmount, 0)
  const totalUtilized = budgets.reduce((sum, b) => sum + b.utilizedAmount, 0)
  const utilizationRate = totalAllocated > 0 ? (totalUtilized / totalAllocated) * 100 : 0

  const pendingStatuses = ['hod_review', 'admin_review', 'dg_review', 'finance_review']
  const pendingApprovals = requisitions.filter((r) => pendingStatuses.includes(r.status)).length

  const statusGroups = new Map<string, { count: number; totalAmount: number }>()
  for (const r of requisitions) {
    const g = statusGroups.get(r.status) ?? { count: 0, totalAmount: 0 }
    g.count++
    g.totalAmount += r.amount
    statusGroups.set(r.status, g)
  }

  const deptGroups = new Map<string, { allocated: number; utilized: number }>()
  for (const b of budgets) {
    const g = deptGroups.get(b.department) ?? { allocated: 0, utilized: 0 }
    g.allocated += b.totalAmount
    g.utilized += b.utilizedAmount
    deptGroups.set(b.department, g)
  }

  return Response.json({
    totalAllocated,
    totalUtilized,
    utilizationRate,
    pendingApprovals,
    requisitionsByStatus: Array.from(statusGroups.entries()).map(([status, v]) => ({
      status,
      ...v,
    })),
    budgetByDepartment: Array.from(deptGroups.entries()).map(([department, v]) => ({
      department,
      ...v,
    })),
  })
}
