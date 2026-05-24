import { DepartmentBudgetFromStore } from '@/components/finance/department-budget-from-store'

export default function BoreholesBudgetPage() {
  return (
    <DepartmentBudgetFromStore
      departmentKey="boreholes"
      title="Borehole registry budget"
    />
  )
}
