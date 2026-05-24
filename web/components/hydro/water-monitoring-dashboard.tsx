'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  MONITORING_POLL_INTERVAL_MS,
  type MonitoringDashboardPayload,
  type MonitoringDataStationsItem,
  type MonitoringFloodRisk,
} from '@/lib/hydro-monitoring-dashboard-types'
import { AlertTriangle, Loader2, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import {
  ExcelColumnFilter,
  matchesExcelSet,
  type ExcelFilterOption,
} from '@/components/hydro/excel-column-filter'
import { cn } from '@/lib/utils'

const RISK_ORDER: MonitoringFloodRisk[] = ['critical', 'high', 'medium', 'low']

const RISK_LABELS: Record<MonitoringFloodRisk, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

const AUTO_REFRESH_NOTE_S = MONITORING_POLL_INTERVAL_MS / 1000

type MonitoringTrend = MonitoringDataStationsItem['trend']

/** Gauge chamber liquid — always water tones; arc / badges / sparklines still follow flood risk. */
const GAUGE_WATER_PALETTE = {
  waterDeep: '#0c4a6e',
  waterMid: '#0284c7',
  waterLight: '#7dd3fc',
  waveBack: '#38bdf8',
  surfaceStops: [
    { c: '#bae6fd', o: 0.4 },
    { c: '#e0f2fe', o: 1 },
    { c: '#7dd3fc', o: 0.5 },
  ] as const,
}

/** Unified visuals: Low = green, Medium = yellow/amber, High/Critical = red — arc, trend, badges. */
function statusVisuals(risk: MonitoringDataStationsItem['floodRisk']) {
  if (risk === 'critical' || risk === 'high') {
    return {
      label: risk === 'critical' ? 'Critical' : 'High',
      badge: 'bg-red-100 text-red-800 border border-red-200',
      arcStroke: '#dc2626',
      arrow: 'text-red-600',
      sparkStart: '#fca5a5',
      sparkEnd: '#991b1b',
      trendLabelClass: 'text-red-600',
    }
  }
  if (risk === 'medium') {
    return {
      label: 'Medium',
      badge: 'bg-yellow-100 text-yellow-900 border border-yellow-300',
      arcStroke: '#ca8a04',
      arrow: 'text-amber-600',
      sparkStart: '#fde047',
      sparkEnd: '#a16207',
      trendLabelClass: 'text-amber-700',
    }
  }
  return {
    label: 'Low',
    badge: 'bg-emerald-100 text-emerald-900 border border-emerald-200',
    arcStroke: '#16a34a',
    arrow: 'text-emerald-600',
    sparkStart: '#86efac',
    sparkEnd: '#15803d',
    trendLabelClass: 'text-emerald-700',
  }
}

/**
 * Government-style water meter gauge.
 * Metallic outer shell → tick ring → glow arc → dark glass chamber → animated water + bubbles.
 * All coordinates are in viewBox "0 0 280 172". cx=140 cy=156 (bottom-centre).
 */
function LightWaterGauge({
  level,
  threshold,
  arcColor,
  idSuffix,
  floodRisk,
}: {
  level: number
  threshold: number
  arcColor: string
  idSuffix: string
  floodRisk: MonitoringDataStationsItem['floodRisk']
}) {
  const w = GAUGE_WATER_PALETTE
  const CX = 140
  const CY = 156
  const BEZEL_OUT = 132
  const BEZEL_IN = 108
  const TICK_OUT = 127
  const ARC_R = 100
  const GLASS_R = 84

  const pct =
    threshold > 0 ? Math.max(0, Math.min((level / threshold) * 100, 100)) : 0

  const arcPath = `M ${CX - ARC_R} ${CY} A ${ARC_R} ${ARC_R} 0 0 1 ${CX + ARC_R} ${CY}`
  const arcLen = Math.PI * ARC_R
  const dashVis = (arcLen * pct) / 100

  const tipAngle = Math.PI - (pct / 100) * Math.PI
  const tipX = CX + ARC_R * Math.cos(tipAngle)
  const tipY = CY - ARC_R * Math.sin(tipAngle)

  const waterFillY = Math.max(CY - GLASS_R, CY - (pct / 100) * GLASS_R)

  const cardSeed = Number.parseInt(idSuffix, 10) % 7

  const baseAmp =
    floodRisk === 'critical' ? 13 : floodRisk === 'high' ? 11 : floodRisk === 'medium' ? 9 : 7
  const waveAmp = +(baseAmp * (1 + (cardSeed % 3) * 0.2)).toFixed(1)

  const baseSpeed =
    floodRisk === 'critical' ? 1.4 : floodRisk === 'high' ? 1.9 : floodRisk === 'medium' ? 2.5 : 3.0
  const cardSpeed = baseSpeed * (1 + (cardSeed % 5) * 0.1)
  const frontDur = `${cardSpeed.toFixed(2)}s`
  const backDur = `${(cardSpeed * 1.45).toFixed(2)}s`

  const W = 112
  const x0 = CX - 3 * W
  const wY = waterFillY
  const backY = wY + 1.5
  const backAmp = +(waveAmp * 0.55).toFixed(1)

  const waveFront =
    `M ${x0} ${wY} Q ${x0 + W / 4} ${(wY - waveAmp).toFixed(1)} ${x0 + W / 2} ${wY} ` +
    `T ${x0 + W} ${wY} T ${x0 + W * 1.5} ${wY} T ${x0 + W * 2} ${wY} ` +
    `T ${x0 + W * 2.5} ${wY} T ${x0 + W * 3} ${wY} T ${x0 + W * 3.5} ${wY} ` +
    `T ${x0 + W * 4} ${wY} T ${x0 + W * 4.5} ${wY} T ${x0 + W * 5} ${wY} ` +
    `L ${x0 + W * 5} ${CY + 8} L ${x0} ${CY + 8} Z`

  const waveBack =
    `M ${x0} ${backY} Q ${x0 + W / 4} ${(backY - backAmp).toFixed(1)} ${x0 + W / 2} ${backY} ` +
    `T ${x0 + W} ${backY} T ${x0 + W * 1.5} ${backY} T ${x0 + W * 2} ${backY} ` +
    `T ${x0 + W * 2.5} ${backY} T ${x0 + W * 3} ${backY} T ${x0 + W * 3.5} ${backY} ` +
    `T ${x0 + W * 4} ${backY} T ${x0 + W * 4.5} ${backY} T ${x0 + W * 5} ${backY} ` +
    `L ${x0 + W * 5} ${CY + 8} L ${x0} ${CY + 8} Z`

  const bubbles = [
    { bx: 88, by: 148, r: 1.4 },
    { bx: 103, by: 138, r: 0.9 },
    { bx: 116, by: 150, r: 0.75 },
    { bx: 130, by: 142, r: 1.2 },
    { bx: 143, by: 151, r: 0.7 },
    { bx: 157, by: 136, r: 1.5 },
    { bx: 170, by: 147, r: 0.85 },
    { bx: 183, by: 141, r: 1.05 },
    { bx: 196, by: 152, r: 0.7 },
  ]

  const levelLabel = `${Math.round(pct)}%`
  const labelCY = CY - GLASS_R * 0.62

  return (
    <div className="relative mx-auto w-full max-w-[280px] shrink-0">
      <svg
        viewBox="0 0 280 172"
        className="h-auto w-full drop-shadow-[0_8px_20px_rgba(15,23,42,0.35)]"
        aria-hidden
      >
        <defs>
          <linearGradient id={`metal-${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="10%">
            <stop offset="0%" stopColor="#4b5563" />
            <stop offset="12%" stopColor="#c8cdd5" />
            <stop offset="28%" stopColor="#f3f4f6" />
            <stop offset="44%" stopColor="#9ca3af" />
            <stop offset="60%" stopColor="#e5e7eb" />
            <stop offset="78%" stopColor="#adb5bd" />
            <stop offset="100%" stopColor="#4b5563" />
          </linearGradient>

          <radialGradient id={`glassFace-${idSuffix}`} cx="48%" cy="26%" r="80%">
            <stop offset="0%" stopColor="#0d2234" />
            <stop offset="55%" stopColor="#071626" />
            <stop offset="100%" stopColor="#020d18" />
          </radialGradient>

          <radialGradient id={`glassSheen-${idSuffix}`} cx="38%" cy="20%" r="58%">
            <stop offset="0%" stopColor="#bfdbfe" stopOpacity="0.28" />
            <stop offset="60%" stopColor="#93c5fd" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </radialGradient>

          <linearGradient id={`water-${idSuffix}`} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={w.waterDeep} stopOpacity="0.96" />
            <stop offset="50%" stopColor={w.waterMid} stopOpacity="0.82" />
            <stop offset="100%" stopColor={w.waterLight} stopOpacity="0.58" />
          </linearGradient>

          <linearGradient id={`surface-${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={w.surfaceStops[0].c} stopOpacity={w.surfaceStops[0].o} />
            <stop offset="40%" stopColor={w.surfaceStops[1].c} stopOpacity={w.surfaceStops[1].o} />
            <stop offset="100%" stopColor={w.surfaceStops[2].c} stopOpacity={w.surfaceStops[2].o} />
          </linearGradient>

          <filter id={`glow-${idSuffix}`} x="-35%" y="-35%" width="170%" height="170%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id={`shadow-${idSuffix}`} x="-15%" y="-15%" width="130%" height="150%">
            <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#020617" floodOpacity="0.5" />
          </filter>

          <clipPath id={`glassClip-${idSuffix}`}>
            <path
              d={`M ${CX - GLASS_R} ${CY} A ${GLASS_R} ${GLASS_R} 0 0 1 ${CX + GLASS_R} ${CY} L ${CX + GLASS_R} ${CY + 10} L ${CX - GLASS_R} ${CY + 10} Z`}
            />
          </clipPath>
        </defs>

        <path
          d={`M ${CX - BEZEL_OUT} ${CY} A ${BEZEL_OUT} ${BEZEL_OUT} 0 0 1 ${CX + BEZEL_OUT} ${CY}
              L ${CX + BEZEL_IN} ${CY} A ${BEZEL_IN} ${BEZEL_IN} 0 0 0 ${CX - BEZEL_IN} ${CY} Z`}
          fill={`url(#metal-${idSuffix})`}
          filter={`url(#shadow-${idSuffix})`}
        />
        <path
          d={`M ${CX - BEZEL_OUT + 2} ${CY} A ${BEZEL_OUT - 2} ${BEZEL_OUT - 2} 0 0 1 ${CX + BEZEL_OUT - 2} ${CY}`}
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.8"
          opacity="0.55"
        />
        <path
          d={`M ${CX - BEZEL_IN} ${CY} A ${BEZEL_IN} ${BEZEL_IN} 0 0 1 ${CX + BEZEL_IN} ${CY}`}
          fill="none"
          stroke="#111827"
          strokeWidth="3"
          opacity="0.7"
        />

        {Array.from({ length: 49 }).map((_, i) => {
          const t = i / 48
          const angle = Math.PI - t * Math.PI
          const major = i % 8 === 0
          const mid = i % 4 === 0 && !major
          const rOuter = TICK_OUT
          const rInner = major ? BEZEL_IN + 2 : mid ? BEZEL_IN + 7 : BEZEL_IN + 11
          return (
            <line
              key={`tick-${idSuffix}-${i}`}
              x1={CX + rOuter * Math.cos(angle)}
              y1={CY - rOuter * Math.sin(angle)}
              x2={CX + rInner * Math.cos(angle)}
              y2={CY - rInner * Math.sin(angle)}
              stroke={major ? '#0f172a' : mid ? '#1f2937' : '#374151'}
              strokeWidth={major ? 2.8 : mid ? 1.8 : 1.0}
              strokeLinecap="round"
              opacity={major ? 0.95 : mid ? 0.82 : 0.65}
            />
          )
        })}

        <path d={arcPath} fill="none" stroke="#0c1a28" strokeWidth="18" strokeLinecap="round" />
        <path d={arcPath} fill="none" stroke="#1e293b" strokeWidth="14" strokeLinecap="round" />
        <path
          d={arcPath}
          fill="none"
          stroke={arcColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dashVis} ${arcLen + 20}`}
          className="transition-all duration-700"
          filter={`url(#glow-${idSuffix})`}
        />
        {pct > 1 && (
          <circle cx={tipX} cy={tipY} r="4.5" fill={arcColor} filter={`url(#glow-${idSuffix})`} />
        )}

        <path
          d={`M ${CX - GLASS_R - 5} ${CY} A ${GLASS_R + 5} ${GLASS_R + 5} 0 0 1 ${CX + GLASS_R + 5} ${CY}`}
          fill="none"
          stroke="#0f172a"
          strokeWidth="5"
        />
        <path
          d={`M ${CX - GLASS_R - 1} ${CY} A ${GLASS_R + 1} ${GLASS_R + 1} 0 0 1 ${CX + GLASS_R + 1} ${CY}`}
          fill="none"
          stroke="#334155"
          strokeWidth="2.5"
        />

        <g clipPath={`url(#glassClip-${idSuffix})`}>
          <path
            d={`M ${CX - GLASS_R} ${CY} A ${GLASS_R} ${GLASS_R} 0 0 1 ${CX + GLASS_R} ${CY} L ${CX + GLASS_R} ${CY + 10} L ${CX - GLASS_R} ${CY + 10} Z`}
            fill={`url(#glassFace-${idSuffix})`}
          />

          <rect
            x={CX - GLASS_R}
            y={waterFillY}
            width={GLASS_R * 2}
            height={CY - waterFillY + 10}
            fill={`url(#water-${idSuffix})`}
          />

          <path d={waveBack} fill={w.waveBack} opacity="0.32">
            <animateTransform
              attributeName="transform"
              type="translate"
              values={`0 0; ${W} 0`}
              dur={backDur}
              calcMode="linear"
              repeatCount="indefinite"
            />
          </path>

          <path d={waveFront} fill={`url(#water-${idSuffix})`}>
            <animateTransform
              attributeName="transform"
              type="translate"
              values={`0 0; ${-W} 0`}
              dur={frontDur}
              calcMode="linear"
              repeatCount="indefinite"
            />
          </path>

          <path
            d={`M ${CX - GLASS_R + 6} ${wY - 1} Q ${CX - 22} ${wY - 10} ${CX} ${wY - 1} T ${CX + GLASS_R - 6} ${wY - 1}`}
            fill="none"
            stroke={`url(#surface-${idSuffix})`}
            strokeWidth="2.4"
            opacity="0.88"
          />

          {bubbles.map((b, i) => (
            <circle
              key={`bub-${idSuffix}-${i}`}
              cx={b.bx}
              cy={b.by}
              r={b.r}
              fill={w.waterLight}
              opacity="0.55"
            >
              <animate
                attributeName="cy"
                values={`${b.by};${b.by - 10};${b.by}`}
                dur={`${2.1 + (i % 5) * 0.32}s`}
                begin={`${(i % 7) * 0.19}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.12;0.7;0.12"
                dur={`${2.1 + (i % 5) * 0.32}s`}
                begin={`${(i % 7) * 0.19}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}

          <path
            d={`M ${CX - GLASS_R} ${CY} A ${GLASS_R} ${GLASS_R} 0 0 1 ${CX + GLASS_R} ${CY} L ${CX + GLASS_R} ${CY + 10} L ${CX - GLASS_R} ${CY + 10} Z`}
            fill={`url(#glassSheen-${idSuffix})`}
          />
        </g>

        <rect
          x={CX - 46}
          y={labelCY - 11}
          width={92}
          height={22}
          rx="6"
          fill="#1e293b"
          opacity="0.9"
          stroke="#475569"
          strokeWidth="0.8"
        />
        <text
          x={CX}
          y={labelCY + 4.5}
          fill="#e2e8f0"
          fontSize="8.2"
          fontWeight="700"
          textAnchor="middle"
          letterSpacing="0.45"
        >
          WATER LEVEL: {levelLabel}
        </text>

        <text x={CX - GLASS_R + 2} y={CY - 4} fill="#94a3b8" fontSize="8" textAnchor="start">
          Min
        </text>
        <text x={CX + GLASS_R - 2} y={CY - 4} fill="#94a3b8" fontSize="8" textAnchor="end">
          Max
        </text>
        <rect
          x={CX - BEZEL_OUT}
          y={CY}
          width={BEZEL_OUT * 2}
          height={7}
          rx="3.5"
          fill="#1f2937"
          opacity="0.55"
        />
      </svg>
    </div>
  )
}

/** Decorative wavy sparkline — always bottom-left → top-right; trend shown in label only. */
function decorativeTrendWave(trend: MonitoringTrend, n = 12): number[] {
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1)
    const ripple = 0.14 * Math.sin(t * Math.PI * 3.5) * Math.sin(t * Math.PI)
    if (trend === 'stable') {
      return 0.22 + t * 0.38 + 0.1 * Math.sin(t * Math.PI * 3.5) * Math.sin(t * Math.PI)
    }
    return 0.12 + t * 0.78 + ripple
  })
}

/** Trend sparkline — uses real level history when 2+ points; otherwise decorative wave. */
function LevelSparkline({
  idSuffix,
  risk,
  trend,
  levels,
}: {
  levels?: number[]
  idSuffix: string
  risk: MonitoringDataStationsItem['floodRisk']
  trend: MonitoringTrend
}) {
  const v = statusVisuals(risk)

  const W = 150
  const H = 76
  const PX = 5
  const PT = 8
  const PB = 8
  const IH = H - PT - PB

  const gradX1 = PX
  const gradX2 = W - PX

  const displayVals = (() => {
    if (levels && levels.length >= 2) {
      const mn = Math.min(...levels)
      const mx = Math.max(...levels)
      const span = mx - mn || 1e-9
      return levels.map((lv) => (lv - mn) / span)
    }
    if (levels && levels.length === 1) {
      return Array.from({ length: 12 }, () => 0.5)
    }
    return decorativeTrendWave(trend)
  })()

  const pts = displayVals.map((vpt, i) => {
    const t = displayVals.length === 1 ? 0.5 : i / (displayVals.length - 1)
    return {
      x: PX + t * (W - 2 * PX),
      y: PT + IH - vpt * IH,
    }
  })

  let linePath = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    linePath += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)},${cp2x.toFixed(1)} ${cp2y.toFixed(1)},${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }

  const last = pts[pts.length - 1]
  const first = pts[0]
  const baseY = (PT + IH).toFixed(1)
  const fillPath = `${linePath} L ${last.x.toFixed(1)} ${baseY} L ${first.x.toFixed(1)} ${baseY} Z`

  const gStroke = `ts-${idSuffix}`
  const gFill = `tf-${idSuffix}`

  const fillTone = trend === 'rising' ? v.sparkEnd : trend === 'falling' ? v.sparkStart : v.sparkEnd

  return (
    <div style={{ width: '150px' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <linearGradient
            id={gStroke}
            x1={gradX1}
            y1="0"
            x2={gradX2}
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={v.sparkStart} />
            <stop offset="100%" stopColor={v.sparkEnd} />
          </linearGradient>
          <linearGradient id={gFill} x1="0" y1={PT} x2="0" y2={PT + IH} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={fillTone} stopOpacity="0.42" />
            <stop offset="100%" stopColor={fillTone} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <path d={fillPath} fill={`url(#${gFill})`} />

        <path
          d={linePath}
          fill="none"
          stroke={`url(#${gStroke})`}
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <circle cx={last.x} cy={last.y} r="4.5" fill={v.sparkEnd} opacity="0.18" />
        <circle cx={last.x} cy={last.y} r="2.8" fill={v.sparkEnd} />
      </svg>

      <p
        className={cn(
          'mt-1 text-center text-[11px] font-semibold tracking-wide',
          v.trendLabelClass
        )}
      >
        Trend{trend === 'rising' ? ' ↑' : trend === 'falling' ? ' ↓' : ''}
      </p>
    </div>
  )
}

function StationCard({ station, index }: { station: MonitoringDataStationsItem; index: number }) {
  const visuals = statusVisuals(station.floodRisk)
  const percent =
    station.threshold > 0
      ? Math.round((station.latestLevel / station.threshold) * 100)
      : 0
  const trend = station.trend ?? 'stable'
  const idSuffix = String(index)

  const TrendIcon = trend === 'rising' ? TrendingUp : trend === 'falling' ? TrendingDown : Minus

  return (
    <article
      data-testid={`card-station-${index}`}
      className={cn(
        'flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md',
        station.status === 'inactive' && 'opacity-80'
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold leading-snug text-slate-900" title={station.station}>
            {station.station}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">{station.region}</p>
          {station.code ? (
            <p className="mt-0.5 text-[11px] text-slate-400">{station.code}</p>
          ) : null}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold leading-none ${visuals.badge}`}
        >
          {visuals.label}
        </span>
      </div>

      <div className="flex flex-1 items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col justify-center space-y-1">
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span className="text-3xl font-bold tabular-nums tracking-tight text-slate-900">
              {station.latestLevel.toFixed(2)}
            </span>
            <span className="text-lg font-semibold text-slate-700">m</span>
            <TrendIcon className={cn('h-5 w-5 shrink-0', visuals.arrow)} strokeWidth={2.5} />
          </div>
          <p className="text-[11px] text-slate-500">
            {station.operationalSampleCount != null ?
              <>
                Operational level — median of last {station.operationalSampleCount} validated reading
                {station.operationalSampleCount === 1 ? '' : 's'} (max 5)
              </>
            : 'Operational level (validated readings)'}
            <span className="px-1 text-slate-300">|</span> {station.threshold} m threshold
          </p>
          <p className="text-xs font-semibold tabular-nums text-slate-900">{percent}% of threshold</p>
        </div>

        <div className="flex shrink-0 items-center justify-center" style={{ width: '200px' }}>
          <LightWaterGauge
            level={station.latestLevel}
            threshold={station.threshold}
            arcColor={visuals.arcStroke}
            idSuffix={idSuffix}
            floodRisk={station.floodRisk}
          />
        </div>

        <div className="flex shrink-0 items-center justify-center" style={{ width: '160px' }}>
          <LevelSparkline
            levels={station.levelHistory}
            idSuffix={idSuffix}
            risk={station.floodRisk}
            trend={trend}
          />
        </div>
      </div>
    </article>
  )
}

/** Embeddable version (no Layout wrapper) for use inside hydrological app shell. */
function stationMatchesFilters(
  station: MonitoringDataStationsItem,
  selectedRisks: Set<string>,
  allRisks: MonitoringFloodRisk[],
  selectedRegions: Set<string>,
  allRegions: string[],
  selectedStationIds: Set<string>,
  allStationIds: string[],
): boolean {
  if (!matchesExcelSet(station.floodRisk, selectedRisks, allRisks)) return false
  if (!matchesExcelSet(station.region, selectedRegions, allRegions)) return false
  if (!matchesExcelSet(station.id, selectedStationIds, allStationIds)) return false
  return true
}

export function WaterMonitoringDashboardContent({
  embedded = false,
  dashboard,
  isLoading,
}: {
  embedded?: boolean
  dashboard: MonitoringDashboardPayload | null
  isLoading: boolean
}) {
  const [selectedRisks, setSelectedRisks] = useState<Set<string>>(() => new Set())
  const [selectedRegions, setSelectedRegions] = useState<Set<string>>(() => new Set())
  const [selectedStationIds, setSelectedStationIds] = useState<Set<string>>(() => new Set())
  const [filtersReady, setFiltersReady] = useState(false)

  const stationCount = dashboard?.stations.length ?? 0

  const riskOptions = useMemo((): ExcelFilterOption[] => {
    if (!dashboard?.stations.length) return []
    const present = new Set(dashboard.stations.map((s) => s.floodRisk))
    return RISK_ORDER.filter((r) => present.has(r)).map((r) => ({
      value: r,
      label: RISK_LABELS[r],
    }))
  }, [dashboard?.stations])

  const allRisks = useMemo(
    () => riskOptions.map((o) => o.value as MonitoringFloodRisk),
    [riskOptions],
  )

  const regionOptions = useMemo((): ExcelFilterOption[] => {
    if (!dashboard?.stations.length) return []
    const set = new Set(dashboard.stations.map((s) => s.region).filter(Boolean))
    return [...set]
      .sort((a, b) => a.localeCompare(b))
      .map((region) => ({ value: region, label: region }))
  }, [dashboard?.stations])

  const allRegions = useMemo(() => regionOptions.map((o) => o.value), [regionOptions])

  const stationOptions = useMemo((): ExcelFilterOption[] => {
    if (!dashboard?.stations.length) return []
    return [...dashboard.stations]
      .sort((a, b) => a.station.localeCompare(b.station))
      .map((s) => ({
        value: s.id,
        label: s.code ? `${s.station} (${s.code})` : s.station,
      }))
  }, [dashboard?.stations])

  const allStationIds = useMemo(() => stationOptions.map((o) => o.value), [stationOptions])

  useEffect(() => {
    if (!dashboard?.stations.length) return
    if (!filtersReady) {
      setSelectedRisks(new Set(allRisks))
      setSelectedRegions(new Set(allRegions))
      setSelectedStationIds(new Set(allStationIds))
      setFiltersReady(true)
    }
  }, [dashboard?.stations, allRisks, allRegions, allStationIds, filtersReady])

  const effectiveRisks = filtersReady ? selectedRisks : new Set(allRisks)
  const effectiveRegions = filtersReady ? selectedRegions : new Set(allRegions)
  const effectiveStationIds = filtersReady ? selectedStationIds : new Set(allStationIds)

  const filteredStations = useMemo(() => {
    if (!dashboard?.stations.length) return []
    return dashboard.stations.filter((s) =>
      stationMatchesFilters(
        s,
        effectiveRisks,
        allRisks,
        effectiveRegions,
        allRegions,
        effectiveStationIds,
        allStationIds,
      ),
    )
  }, [
    dashboard?.stations,
    effectiveRisks,
    allRisks,
    effectiveRegions,
    allRegions,
    effectiveStationIds,
    allStationIds,
  ])

  const anyFilterActive =
    filtersReady &&
    ((selectedRisks.size > 0 && selectedRisks.size < allRisks.length) ||
      (selectedRegions.size > 0 && selectedRegions.size < allRegions.length) ||
      (selectedStationIds.size > 0 && selectedStationIds.size < allStationIds.length))

  const inner = (
    <div className="mx-auto max-w-[1920px] space-y-5">
      {!embedded && (
        <header className="border-b border-slate-100 pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Water monitoring dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Card levels use the median of the last up to five HoD-validated readings per station; trend uses a
            short regression on those points. Pending and rejected readings are excluded. This page refreshes
            every few seconds.
          </p>
        </header>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 py-16 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-hidden />
          <p className="text-sm">Loading monitoring data…</p>
        </div>
      ) : dashboard && stationCount > 0 ? (
        <>
          {dashboard.alertCount > 0 && (
            <div
              role="status"
              className="sticky top-0 z-10 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-red-900 shadow-sm"
            >
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
              <p className="text-sm font-semibold">
                {dashboard.alertCount} flood alert(s) active — immediate review required
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
            <span className="mr-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              Filters
            </span>
            {riskOptions.length > 0 ? (
              <ExcelColumnFilter
                label="Flood risk"
                options={riskOptions}
                selected={selectedRisks}
                onSelectedChange={setSelectedRisks}
              />
            ) : null}
            {regionOptions.length > 0 ? (
              <ExcelColumnFilter
                label="Location"
                options={regionOptions}
                selected={selectedRegions}
                onSelectedChange={setSelectedRegions}
              />
            ) : null}
            {stationOptions.length > 0 ? (
              <ExcelColumnFilter
                label="River / station"
                options={stationOptions}
                selected={selectedStationIds}
                onSelectedChange={setSelectedStationIds}
              />
            ) : null}
            {anyFilterActive ? (
              <span className="text-xs text-slate-500">
                {filteredStations.length} of {stationCount} shown
              </span>
            ) : null}
          </div>

          {filteredStations.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-slate-600">
              No stations match your filters. Open a column filter and adjust your selection, or click Clear.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
              {filteredStations.map((station, index) => (
                <StationCard
                  key={`${station.id}::${index}`}
                  station={station}
                  index={index}
                />
              ))}
            </div>
          )}

          <p className="text-xs text-slate-400">
            Last updated: {new Date(dashboard.lastUpdated).toLocaleString()} ·{' '}
            {filteredStations.length === stationCount
              ? `${stationCount} ${stationCount === 1 ? 'location' : 'locations'}`
              : `${filteredStations.length} of ${stationCount} locations shown`}
            · UI polled every {AUTO_REFRESH_NOTE_S}s (page refresh)
          </p>
        </>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-slate-600">
          No stations with HoD-validated readings yet. Validate readings on the readings register to show
          live levels here; pending or rejected-only data does not appear.
        </div>
      )}
    </div>
  )

  if (embedded) return <div className="space-y-5 py-4">{inner}</div>

  return <div className="-mx-4 -mt-4 min-h-[calc(100vh-3.5rem)] bg-white px-4 pb-10 pt-4 md:-mx-6 md:px-6 md:pt-6">{inner}</div>
}
