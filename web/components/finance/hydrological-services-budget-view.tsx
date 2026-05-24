'use client'

import { DepartmentBudgetFromStore } from '@/components/finance/department-budget-from-store'
import { HYDROLOGICAL_SERVICES_DEPARTMENT_DISPLAY_NAME } from '@/lib/org-departments'

const PAGE_TITLE = `${HYDROLOGICAL_SERVICES_DEPARTMENT_DISPLAY_NAME} budget`

export function HydrologicalServicesBudgetView() {
  return (
    <DepartmentBudgetFromStore
      departmentKey="hydrological"
      title={PAGE_TITLE}
    />
  )
}
