'use client'

import type { CanonicalDept } from '@/lib/orgDepartments'

export type PublicFormBudgetLine = {
  code: string
  budgetId: number
  label: string
  project: string
  fiscalYear: string
  availableBalance: number
  pendingCommittedInApprovalPipeline?: number
}

type Props = {
  departments: Array<{ id: CanonicalDept; label: string }>
  budgetLinesByDepartment: Record<string, PublicFormBudgetLine[]>
  department: CanonicalDept | ''
  budgetCode: string
  onDepartmentChange: (dept: CanonicalDept) => void
  onBudgetCodeChange: (code: string) => void
  selectedProgramme: PublicFormBudgetLine | null
  lockDepartment?: boolean
  budgetLoading?: boolean
}

export function PublicPortalDeptBudgetFields({
  departments,
  budgetLinesByDepartment,
  department,
  budgetCode,
  onDepartmentChange,
  onBudgetCodeChange,
  selectedProgramme,
  lockDepartment = false,
  budgetLoading = false,
}: Props) {
  const budgetOptions = department ? (budgetLinesByDepartment[department] ?? []) : []

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="portal-dept">
          Department
        </label>
        <select
          id="portal-dept"
          required
          disabled={lockDepartment}
          value={department}
          onChange={(e) => onDepartmentChange(e.target.value as CanonicalDept)}
          className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm disabled:opacity-60"
        >
          <option value="">Select department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="portal-budget">
          Budget code
        </label>
        <select
          id="portal-budget"
          required
          disabled={!department || budgetLoading || budgetOptions.length === 0}
          value={budgetCode}
          onChange={(e) => onBudgetCodeChange(e.target.value)}
          className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
        >
          <option value="">
            {budgetLoading ?
              'Loading budget lines…'
            : !department ?
              'Select department first'
            : budgetOptions.length === 0 ?
              'No budget lines for this department'
            : 'Select budget code'}
          </option>
          {budgetOptions.map((b) => (
            <option key={b.code} value={b.code}>
              {b.label}
            </option>
          ))}
        </select>
      </div>
      {selectedProgramme && (
        <p className="text-muted-foreground sm:col-span-2 text-xs">
          Available: NLe{' '}
          {(
            selectedProgramme.availableBalance -
            (selectedProgramme.pendingCommittedInApprovalPipeline ?? 0)
          ).toLocaleString('en-GB')}{' '}
          · FY {selectedProgramme.fiscalYear}
        </p>
      )}
    </div>
  )
}
