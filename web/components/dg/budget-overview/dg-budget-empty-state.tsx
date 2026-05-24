'use client'

export function DgBudgetEmptyState() {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-8 text-center shadow-sm dark:border-border dark:bg-card">
      <p className="text-sm text-muted-foreground">
        No departmental allocations yet. When Finance creates programme budgets under{' '}
        <span className="font-medium text-foreground">Finance → Budgets</span>, departments will
        appear here automatically.
      </p>
    </div>
  )
}
