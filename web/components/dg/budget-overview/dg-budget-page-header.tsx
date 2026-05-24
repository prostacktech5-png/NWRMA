'use client'

import { FileSpreadsheet, User } from 'lucide-react'

export function DgBudgetPageHeader({
  fiscalLabel,
  userName,
  userEmail,
}: {
  fiscalLabel: string
  userName: string
  userEmail: string
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-white shadow-sm ring-1 ring-black/[0.04] dark:border-zinc-800 dark:bg-zinc-900">
          <FileSpreadsheet className="h-6 w-6 text-zinc-600 dark:text-zinc-300" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Organisational Budget Overview</h1>
          <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Director General — Fiscal Year {fiscalLabel}
          </p>
        </div>
      </div>
      <div className="flex items-start justify-end gap-2 text-right text-xs sm:pt-1">
        <div>
          <p className="font-semibold text-[#1EB53A]">Director General Portal</p>
          <p className="mt-1 inline-flex flex-wrap items-center justify-end gap-1.5 text-muted-foreground">
            <span className="font-medium text-foreground">{userName}</span>
            <span className="text-zinc-400 dark:text-zinc-500">·</span>
            <span className="tabular-nums">{userEmail}</span>
          </p>
        </div>
        <div
          className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
          aria-hidden
        >
          <User className="h-4 w-4" strokeWidth={2} />
        </div>
      </div>
    </div>
  )
}
