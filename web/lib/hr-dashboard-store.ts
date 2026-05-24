import { getDgLeaveStore } from '@/lib/dg-leave-store'
import { birthdayInNextDays } from '@/lib/hr-birthday-utils'
import { listHrEmployees } from '@/lib/hr-employee-store'
import { listHrAssets } from '@/lib/hr-asset-store'
import { listPayrollRuns } from '@/lib/hr-payroll-store'
import { countExpiringSubscriptions, listHrSubscriptions } from '@/lib/hr-subscription-store'

export async function getHrDashboardStats() {
  const [employees, assets, leaves, payrollRuns, subscriptions] = await Promise.all([
    listHrEmployees(),
    listHrAssets(),
    getDgLeaveStore(),
    listPayrollRuns(),
    listHrSubscriptions(),
  ])

  const active = employees.filter((e) => e.employmentStatus === 'active').length
  const onLeave = employees.filter((e) => e.employmentStatus === 'on_leave').length
  const assetsAssigned = assets.filter((a) => a.status === 'in_use').length
  const pendingLeave = leaves.filter((l) => l.status === 'hod_review').length

  const now = new Date()

  const birthdaysThisWeek = employees.filter(
    (e) => e.dateOfBirth && birthdayInNextDays(e.dateOfBirth, 7, now)
  ).length

  const warrantySoon = assets.filter((a) => {
    if (!a.warrantyExpiry) return false
    const days = (a.warrantyExpiry.getTime() - now.getTime()) / 86_400_000
    return days >= 0 && days <= 30
  }).length

  const payrollPendingApproval = payrollRuns.filter(
    (r) => r.status === 'submitted' || r.status === 'hr_approved'
  ).length

  const subscriptionsExpiringSoon = countExpiringSubscriptions(subscriptions, 30)

  return {
    totalEmployees: employees.length,
    activeEmployees: active,
    onLeaveCount: onLeave,
    assetsTotal: assets.length,
    assetsAssigned,
    pendingLeave,
    birthdaysThisWeek,
    warrantyExpiringSoon: warrantySoon,
    payrollPendingApproval,
    subscriptionsExpiringSoon,
  }
}
