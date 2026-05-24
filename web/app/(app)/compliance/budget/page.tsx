import { DepartmentBudgetFromStore } from '@/components/finance/department-budget-from-store'

export default function ComplianceBudgetPage() {
  return (
    <DepartmentBudgetFromStore
      departmentKey="compliance"
      title="Compliance budget"
      subtitle="Programme budgets for the Legal, Regulations and Outreach department in Finance → Budgets."
    />
  )
}
