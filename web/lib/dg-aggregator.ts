import { getFinanceApiStore } from '@/lib/finance-api-store'
import { getHydroPaymentStore } from '@/lib/hydro-payment-store'
import { getDgLeaveStore } from '@/lib/dg-leave-store'
import type { FinanceRequisitionRow } from '@/lib/finance-api-store'
import { departmentNames, formatNLe } from '@/lib/mock-data'
import {
  type CanonicalDept,
  financeBudgetDepartmentMatches,
  mergeDeptStatsForDgOverview,
  type DeptStat,
  VALID_DEPTS,
} from '@/lib/orgDepartments'

const PIPELINE = new Set(['hod_review', 'admin_review', 'dg_review', 'finance_review'])

export type DgAlert = {
  id: string
  severity: 'critical' | 'warning' | 'info'
  type: 'budget_threshold' | 'pending_at_risk' | 'dg_action_required'
  department: string
  message: string
  detail: string
  value: number
  timestamp: string
}

function formatYearMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map((x) => parseInt(x, 10))
  if (!y || !m) return ym
  return new Date(y, m - 1, 1).toLocaleString('en-GB', { month: 'short', year: 'numeric' })
}

/** Map legacy routes (pre petty-threshold policy) to modern `full_chain` for UI badges. */
function normalizeLegacyApprovalRoute(route: string | null): string {
  const t = (route ?? '').trim()
  if (!t || t === 'hod_only' || t === 'hod_then_dg' || t === 'dg_required') return 'full_chain'
  return t
}

function mapReqForPending(r: FinanceRequisitionRow) {
  return {
    id: r.id,
    title: r.title,
    requestedBy: r.requestedBy,
    department: r.department,
    amount: r.amount,
    status: r.status,
    approvalRoute: normalizeLegacyApprovalRoute(r.approvalRoute),
    createdAt: r.createdAt.toISOString(),
    description: r.description,
  }
}

export async function buildDgSummary() {
  const [fin, hydro, leaves] = await Promise.all([
    getFinanceApiStore(),
    getHydroPaymentStore(),
    getDgLeaveStore(),
  ])
  const reqs = fin.requisitions
  const pipelineReqs = reqs.filter((r) => PIPELINE.has(r.status))
  const dgReview = reqs.filter((r) => r.status === 'dg_review')
  const submittedPay = hydro.payments.filter((p) => p.status === 'submitted')
  const approvedPay = hydro.payments.filter((p) => p.status === 'approved')
  const leaveAwaitingHrHod = leaves.filter((l) => l.status === 'hod_review')
  const leaveAwaitingDg = leaves.filter((l) => l.status === 'dg_review')

  const budgets = fin.budgets
  const totalAllocated = budgets.reduce((s, b) => s + b.totalAmount, 0)
  const totalUtilized = budgets.reduce((s, b) => s + b.utilizedAmount, 0)
  const utilizationRate = totalAllocated > 0 ? (totalUtilized / totalAllocated) * 100 : 0

  return {
    pendingApprovals:
      pipelineReqs.length +
      submittedPay.length +
      approvedPay.length +
      leaveAwaitingHrHod.length +
      leaveAwaitingDg.length,
    requisitionsPendingDG: dgReview.length,
    totalPendingAmount: dgReview.reduce((s, r) => s + r.amount, 0),
    pendingOfficerPayments: submittedPay.length + approvedPay.length,
    pendingLeaveRequests: leaveAwaitingDg.length,
    pendingLeaveAwaitingHrHod: leaveAwaitingHrHod.length,
    unconfirmedTestPayments: 0,
    reqsByStage: {
      hod: reqs.filter((r) => r.status === 'hod_review').length,
      admin: reqs.filter((r) => r.status === 'admin_review').length,
      dg: reqs.filter((r) => r.status === 'dg_review').length,
      finance: reqs.filter((r) => r.status === 'finance_review').length,
    },
    budgetHealth: {
      totalAllocated,
      totalUtilized,
      utilizationRate,
    },
  }
}

export async function buildDgPending() {
  const [fin, hydro, leaves] = await Promise.all([
    getFinanceApiStore(),
    getHydroPaymentStore(),
    getDgLeaveStore(),
  ])

  const requisitions = fin.requisitions.filter((r) => PIPELINE.has(r.status)).map(mapReqForPending)

  const officerPayments = hydro.payments
    .filter((p) => p.status === 'submitted' || p.status === 'approved')
    .map((p) => ({
      id: p.id,
      officerName: p.officerName,
      month: formatYearMonthLabel(p.yearMonth),
      totalAmount: String(p.totalSle),
      validSubmissions: p.validSubmissions,
      status: p.status,
    }))

  const msDay = 86_400_000
  const leaveRequests = leaves
    .filter((l) => l.status === 'dg_review')
    .map((l) => {
      const start = new Date(l.start)
      const end = new Date(l.end)
      const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / msDay) + 1)
      return {
        id: l.id,
        staffName: l.employeeName,
        type: l.type,
        startDate: start.toLocaleDateString('en-GB'),
        endDate: end.toLocaleDateString('en-GB'),
        days,
        reason: l.comment,
        status: l.status,
      }
    })

  return { requisitions, officerPayments, leaveRequests }
}

export async function buildDgAlerts(): Promise<{
  alerts: DgAlert[]
  criticalCount: number
  warningCount: number
  infoCount: number
  lastUpdated: string
}> {
  const fin = await getFinanceApiStore()
  const now = new Date().toISOString()
  const alerts: DgAlert[] = []
  let n = 0

  const byDept = new Map<string, { allocated: number; utilized: number; pendingAmt: number }>()
  for (const b of fin.budgets) {
    const g = byDept.get(b.department) ?? { allocated: 0, utilized: 0, pendingAmt: 0 }
    g.allocated += b.totalAmount
    g.utilized += b.utilizedAmount
    byDept.set(b.department, g)
  }
  for (const r of fin.requisitions) {
    if (!PIPELINE.has(r.status)) continue
    const g = byDept.get(r.department) ?? { allocated: 0, utilized: 0, pendingAmt: 0 }
    g.pendingAmt += r.amount
    byDept.set(r.department, g)
  }

  for (const [dept, v] of byDept) {
    const util = v.allocated > 0 ? (v.utilized / v.allocated) * 100 : 0
    const label = departmentNames[dept] ?? dept
    if (util >= 90) {
      alerts.push({
        id: `b-${++n}`,
        severity: 'critical',
        type: 'budget_threshold',
        department: label,
        message: `Utilisation has reached ${util.toFixed(0)}%`,
        detail: `${formatNLe(v.utilized)} of ${formatNLe(v.allocated)} consumed`,
        value: util,
        timestamp: now,
      })
    } else if (util >= 75) {
      alerts.push({
        id: `b-${++n}`,
        severity: 'warning',
        type: 'budget_threshold',
        department: label,
        message: `Approaching budget ceiling (${util.toFixed(0)}%)`,
        detail: 'Consider pacing new commitments.',
        value: util,
        timestamp: now,
      })
    }
    if (v.pendingAmt > 0 && util > 60) {
      alerts.push({
        id: `p-${++n}`,
        severity: util > 85 ? 'critical' : 'warning',
        type: 'pending_at_risk',
        department: label,
        message: `${formatNLe(v.pendingAmt)} in the approval pipeline`,
        detail: 'Reserved until approvals complete.',
        value: v.pendingAmt,
        timestamp: now,
      })
    }
  }

  const dgQueue = fin.requisitions.filter((r) => r.status === 'dg_review').length
  if (dgQueue > 0) {
    alerts.push({
      id: `d-${++n}`,
      severity: 'info',
      type: 'dg_action_required',
      department: 'Organisation',
      message: `${dgQueue} requisition(s) await DG sign-off`,
      detail: 'Review the Approvals Centre.',
      value: dgQueue,
      timestamp: now,
    })
  }

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length
  const warningCount = alerts.filter((a) => a.severity === 'warning').length
  const infoCount = alerts.filter((a) => a.severity === 'info').length

  return {
    alerts,
    criticalCount,
    warningCount,
    infoCount,
    lastUpdated: now,
  }
}

export interface BudgetLineRow {
  id: number
  department: string
  project: string
  source: string
  totalAmount: number
  utilizedAmount: number
  availableBalance: number
  fiscalYear: string
}

export interface BudgetOverviewPayload {
  departments: DeptStat[]
  totalAllocated: number
  totalUtilized: number
  totalAvailable: number
  utilizationRate: number
  budgets: BudgetLineRow[]
}

export async function buildDgBudgetOverview(): Promise<BudgetOverviewPayload> {
  const fin = await getFinanceApiStore()
  const reqs = fin.requisitions

  const raw: DeptStat[] = VALID_DEPTS.map((dept: CanonicalDept) => {
    const budgets = fin.budgets.filter((b) => financeBudgetDepartmentMatches(b.department, dept))
    const allocated = budgets.reduce((s, b) => s + b.totalAmount, 0)
    const utilized = budgets.reduce((s, b) => s + b.utilizedAmount, 0)
    const deptReqs = reqs.filter((r) => financeBudgetDepartmentMatches(r.department, dept))
    const pending = deptReqs.filter((r) => PIPELINE.has(r.status))
    return {
      department: dept,
      allocated,
      utilized,
      availableBalance: allocated - utilized,
      utilizationRate: allocated > 0 ? (utilized / allocated) * 100 : 0,
      requisitionsCount: deptReqs.length,
      requisitionsTotal: deptReqs
        .filter((r) => r.status !== 'rejected')
        .reduce((s, r) => s + r.amount, 0),
      pendingCount: pending.length,
      pendingAmount: pending.reduce((s, r) => s + r.amount, 0),
    }
  })

  const departments = mergeDeptStatsForDgOverview(raw)

  const totalAllocated = fin.budgets.reduce((s, b) => s + b.totalAmount, 0)
  const totalUtilized = fin.budgets.reduce((s, b) => s + b.utilizedAmount, 0)
  const utilizationRate = totalAllocated > 0 ? (totalUtilized / totalAllocated) * 100 : 0

  const budgets: BudgetLineRow[] = fin.budgets
    .filter((b) => b.totalAmount > 0)
    .map((b) => ({
      id: b.id,
      department: b.department,
      project: b.project,
      source: b.source,
      totalAmount: b.totalAmount,
      utilizedAmount: b.utilizedAmount,
      availableBalance: b.totalAmount - b.utilizedAmount,
      fiscalYear: b.fiscalYear,
    }))

  return {
    departments,
    totalAllocated,
    totalUtilized,
    totalAvailable: totalAllocated - totalUtilized,
    utilizationRate,
    budgets,
  }
}
