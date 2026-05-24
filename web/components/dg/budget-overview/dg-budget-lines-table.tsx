'use client'

import { ShieldHalf } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  compareBudgetLinesForDgTable,
  dgTableDepartmentLabel,
} from '@/lib/dg-budget-presentation'
import { formatNLe } from '@/lib/formatLeone'
import type { BudgetLine } from '@/components/dg/budget-overview/dg-budget-types'

function Sparkline({ budgetId, pct }: { budgetId: number; pct: number }) {
  const seed = budgetId * 137
  const pts = Array.from({ length: 12 }, (_, i) => {
    const noise = ((seed * (i + 1) * 31) % 38) - 19
    return Math.max(4, Math.min(96, pct + noise))
  })

  const w = 76
  const h = 26
  const xs = pts.map((_, i) => (i / (pts.length - 1)) * w)
  const ys = pts.map((p) => h - (p / 100) * h)
  const pathD = pts.map((_, i) => `${i === 0 ? 'M' : 'L'} ${xs[i]?.toFixed(1)} ${ys[i]?.toFixed(1)}`).join(' ')
  const bottomY = h
  const areaD = `${pathD} L ${w} ${bottomY} L 0 ${bottomY} Z`
  const color = pct > 90 ? '#ef4444' : pct > 70 ? '#ea580c' : '#22c55e'

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[26px] w-[76px]" aria-hidden>
      <path d={areaD} fill={color} fillOpacity={0.12} stroke="none" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function healthBadgeLabel(utilizationPct: number): string {
  const n = Math.max(1, Math.min(99, Math.round(utilizationPct)))
  return `> ${n}%`
}


function SourcePill({ source }: { source: string }) {
  const s = source.trim().toLowerCase()
  const isDonor = s === 'donor'
  const label = source.charAt(0).toUpperCase() + source.slice(1).toLowerCase()
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold',
        isDonor
          ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/80 dark:text-violet-300'
          : 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300'
      )}
    >
      {label}
    </span>
  )
}


export function DgBudgetLinesTable({
  lines,
  fiscalLabel,
}: {
  lines: BudgetLine[]
  fiscalLabel: string
}) {
  const sorted = [...lines].sort((a, b) =>
    compareBudgetLinesForDgTable(a.department, b.department),
  )

  return (
    <section>
      <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        Budget Lines - Fiscal Year {fiscalLabel}
      </h2>
      <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-border dark:bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/90 dark:border-zinc-800 dark:bg-zinc-900/50">
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Department</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Project</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Source</th>
                <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Allocated</th>
                <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Utilized</th>
                <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Available</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {sorted.map((b) => {
                const pct = b.totalAmount > 0 ? (b.utilizedAmount / b.totalAmount) * 100 : 0
                const isWarn = pct > 70
                const badge = healthBadgeLabel(pct)
                return (
                  <tr key={b.id} data-testid={`dg-budget-line-${b.id}`} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/30">
                    <td className="px-5 py-3.5 font-medium">{dgTableDepartmentLabel(b.department)}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{b.project}</td>
                    <td className="px-5 py-3.5"><SourcePill source={b.source} /></td>
                    <td className="px-5 py-3.5 text-right tabular-nums">{formatNLe(b.totalAmount)}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums">{formatNLe(b.utilizedAmount)}</td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{formatNLe(b.availableBalance)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Sparkline budgetId={b.id} pct={pct} />
                        <div
                          className={cn(
                            'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold shadow-sm',
                            pct > 90
                              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400'
                              : isWarn
                                ? 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400',
                          )}
                        >
                          <ShieldHalf className="h-3 w-3 opacity-90" strokeWidth={2} />
                          {badge}
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
