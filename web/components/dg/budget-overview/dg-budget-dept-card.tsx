'use client'

import { useId, type ElementType } from 'react'
import { Droplets, FlaskConical, Settings, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DgOverviewCardId, DeptOverviewCard } from '@/lib/dg-budget-presentation'
import { formatNLe } from '@/lib/formatLeone'

function MetallicUtilizationGauge({ pct }: { pct: number }) {
  const rid = useId().replace(/:/g, '')
  const idTrack = `gt-${rid}`
  const idFill = `gf-${rid}`
  const idBlur = `gb-${rid}`
  const cx = 100
  const cy = 100
  const r = 74
  const stroke = 14
  const p = Math.min(100, Math.max(0, pct))

  const arcPoint = (t: number) => {
    const theta = Math.PI * (1 - t)
    return { x: cx + r * Math.cos(theta), y: cy - r * Math.sin(theta) }
  }

  const left = arcPoint(0)
  const right = arcPoint(1)
  const arcPath = `M ${left.x.toFixed(2)} ${left.y.toFixed(2)} A ${r} ${r} 0 0 1 ${right.x.toFixed(2)} ${right.y.toFixed(2)}`

  const arcLen = Math.PI * r
  const dashOffset = arcLen - (p / 100) * arcLen

  const isHigh = pct > 70
  const isCrit = pct > 90

  return (
    <svg viewBox="0 0 200 118" className="mx-auto block h-auto w-full max-w-[200px]" aria-hidden>
      <defs>
        <linearGradient id={idTrack} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="50%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id={idFill} x1="0%" y1="0%" x2="100%" y2="100%">
          {isCrit ? (
            <>
              <stop offset="0%" stopColor="#fecaca" />
              <stop offset="100%" stopColor="#dc2626" />
            </>
          ) : isHigh ? (
            <>
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="40%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#bbf7d0" />
              <stop offset="45%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#15803d" />
            </>
          )}
        </linearGradient>
        <filter id={idBlur} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="b" />
          <feOffset dx="0" dy="1" result="o" />
          <feMerge>
            <feMergeNode in="o" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <ellipse cx={cx} cy={cy + 6} rx="86" ry="9" fill="#0f172a" opacity="0.055" />

      <path
        d={arcPath}
        fill="none"
        stroke={`url(#${idTrack})`}
        strokeWidth={stroke + 6}
        strokeLinecap="round"
        opacity={0.35}
      />
      <path d={arcPath} fill="none" stroke="#f8fafc" strokeWidth={stroke} strokeLinecap="round" />
      <path
        d={arcPath}
        fill="none"
        stroke={`url(#${idFill})`}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={arcLen}
        strokeDashoffset={dashOffset}
        filter={`url(#${idBlur})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
      />
      <path d={arcPath} fill="none" stroke="white" strokeWidth={1.5} strokeLinecap="round" opacity={0.22} />

      <text
        x={cx}
        y={cy - 26}
        textAnchor="middle"
        className="fill-foreground font-bold"
        style={{ fontSize: '26px' }}
      >
        {pct.toFixed(1)}%
      </text>
      <text
        x={cx}
        y={cy - 10}
        textAnchor="middle"
        className="fill-muted-foreground"
        style={{ fontSize: '8.5px', letterSpacing: '0.22em' }}
      >
        UTILIZATION
      </text>
    </svg>
  )
}


const OVERVIEW_CARD_META: Record<DgOverviewCardId, { icon: ElementType; iconWrap: string }> = {
  operations: {
    icon: Settings,
    iconWrap:
      'bg-slate-100 text-slate-700 ring-slate-200/80 dark:bg-slate-800 dark:text-slate-300',
  },
  hydrological: {
    icon: Droplets,
    iconWrap:
      'bg-sky-100 text-sky-600 ring-sky-200/80 dark:bg-sky-950 dark:text-sky-400',
  },
  laboratory: {
    icon: FlaskConical,
    iconWrap:
      'bg-orange-50 text-orange-600 ring-orange-200/80 dark:bg-orange-950/50 dark:text-orange-400',
  },
  it: {
    icon: Monitor,
    iconWrap:
      'bg-blue-50 text-blue-600 ring-blue-200/80 dark:bg-blue-950/50 dark:text-blue-400',
  },
}

export function DgBudgetDeptCard({
  dept,
  cardId,
}: {
  dept: DeptOverviewCard
  cardId: DgOverviewCardId
}) {
  const { icon: Icon, iconWrap } = OVERVIEW_CARD_META[cardId]
  const pct = dept.utilizationRate
  const isWarning = pct > 70

  return (
    <div
      data-testid={`dg-budget-dept-${cardId}`}
      className={cn(
        'rounded-2xl border bg-white p-5 shadow-sm dark:bg-card',
        isWarning
          ? 'border-orange-200/90 ring-1 ring-orange-100/80 dark:border-orange-900/50'
          : 'border-zinc-200/80 dark:border-border'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold tracking-tight text-foreground">{dept.department}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {dept.requisitionsCount} requisition(s) - {formatNLe(dept.requisitionsTotal)} total
          </p>
        </div>
        <div className={cn('flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ring-1 ring-inset', iconWrap)}>
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">Utilization</span>
        <span className="font-bold tabular-nums text-foreground">{pct.toFixed(1)}%</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={cn(
            'h-2 rounded-full transition-all duration-500',
            pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-orange-500' : 'bg-emerald-500'
          )}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      {/* Allocated | gauge | Available — mock layout; Utilized sits under the gauge */}
      <div className="mt-3 flex flex-row items-end justify-between gap-2 sm:items-stretch sm:gap-3">
        <div className="flex min-w-0 flex-1 flex-col justify-center rounded-xl border border-zinc-100 bg-zinc-50/90 py-4 px-2 text-center dark:border-zinc-800 dark:bg-zinc-900/40 sm:py-5 sm:px-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Allocated</p>
          <p className="mt-1.5 text-sm font-bold leading-tight tabular-nums sm:text-base">{formatNLe(dept.allocated)}</p>
        </div>

        <div className="flex w-[min(100%,200px)] shrink-0 flex-col items-center justify-end sm:w-[200px]">
          <div className="w-full max-w-[200px]">
            <MetallicUtilizationGauge pct={pct} />
          </div>
          <div className="-mt-0.5 w-full text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Utilized</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-foreground">{formatNLe(dept.utilized)}</p>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center rounded-xl border border-emerald-100 bg-emerald-50/80 py-4 px-2 text-center dark:border-emerald-900/50 dark:bg-emerald-950/30 sm:py-5 sm:px-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800/80 dark:text-emerald-400/90">
            Available
          </p>
          <p className="mt-1.5 text-sm font-bold leading-tight tabular-nums text-emerald-700 dark:text-emerald-400 sm:text-base">
            {formatNLe(dept.availableBalance)}
          </p>
        </div>
      </div>

      <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <p className="rounded-lg bg-zinc-50 px-3 py-2.5 text-xs text-muted-foreground dark:bg-zinc-900/50">
          {dept.pendingCount} pending requisition(s)
          {dept.pendingCount > 0 ? (
            <>
              {' '}
              -{' '}
              <span className="font-semibold tabular-nums text-orange-600 dark:text-orange-400">
                {formatNLe(dept.pendingAmount)} at risk
              </span>
            </>
          ) : null}
        </p>
      </div>
    </div>
  )
}


export function DgBudgetDeptGrid({ cards }: { cards: DeptOverviewCard[] }) {
  if (cards.length === 0) return null

  return (
    <section>
      <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        Department Allocation &amp; Utilization
      </h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {cards.map((row) => (
          <DgBudgetDeptCard key={row.cardId} dept={row} cardId={row.cardId} />
        ))}
      </div>
    </section>
  )
}
