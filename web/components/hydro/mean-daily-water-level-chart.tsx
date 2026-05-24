'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Label,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Loader2, TrendingDown, ChartColumnIncreasing } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { mergeMeanDailySeriesForChart } from '@/lib/hydro-mean-daily-build'

export type MeanDailyLevelsPayload = {
  mode?: 'single' | 'multi'
  rangeDays: number
  stationId: string | null
  stationLabel: string | null
  month: string | null
  stations: Array<{ id: string; name: string; district: string; dayCount: number }>
  availableMonths: string[]
  series: Array<{ date: string; meanLevelM: number; sampleCount: number }>
  multiSeries?: Array<{
    stationId: string
    stationLabel: string
    series: Array<{ date: string; meanLevelM: number; sampleCount: number }>
  }>
  subtitle: string
  dataRangeCaption: string
  periodLabels: { displayStart: string; displayEnd: string }
  peakSummary: string | null
  lowSummary: string | null
  annotations: {
    peaks: Array<{ date: string; label: string; meanLevelM: number }>
  }
}

const ALL_MONTHS = '__all__'
const ALL_RIVERS = '__all__'

const STATION_LINE_COLORS = [
  '#0284c7',
  '#ea580c',
  '#16a34a',
  '#9333ea',
  '#dc2626',
  '#0891b2',
  '#ca8a04',
  '#db2777',
  '#4f46e5',
  '#0d9488',
  '#c2410c',
  '#7c3aed',
] as const

function formatAxisDate(iso: string): string {
  const parts = iso.split('-')
  if (parts.length !== 3) return iso
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

function formatMonthLabel(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-')
  if (!y || !m) return yyyyMm
  return `01/${m}/${y}`
}

/** First in-series date per calendar month (for long timelines). */
function monthStartTicks(dates: string[]): string[] {
  const seen = new Set<string>()
  const ticks: string[] = []
  for (const d of dates) {
    const key = d.slice(0, 7)
    if (seen.has(key)) continue
    seen.add(key)
    ticks.push(d)
  }
  return ticks
}

const chartSurfaceClass =
  'rounded-none border-x-0 border-b-0 bg-white px-4 pb-4 pt-4 sm:px-6'

const TOOLTIP_CURSOR = { stroke: '#cbd5e1', strokeWidth: 1 }

const TOOLTIP_BOX_STYLE = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  boxShadow: '0 4px 14px rgba(15,23,42,0.08)',
} as const

function meanStageTooltipValue(value: number | string): [string, string] {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return ['Mean stage : —', '']
  return [`Mean stage : ${n.toFixed(2)} m`, '']
}

/** White rounded callout for peak ReferenceDot labels (reference chart style). */
function PeakCalloutLabel(props: {
  viewBox?: { x?: number; y?: number }
  value?: string
}) {
  const x = props.viewBox?.x ?? 0
  const y = props.viewBox?.y ?? 0
  const text = props.value ?? ''
  if (!text) return null
  const padX = 8
  const charW = 6.2
  const w = Math.min(220, Math.max(88, text.length * charW + padX * 2))
  const h = 22
  return (
    <g>
      <rect
        x={x - w / 2}
        y={y - h - 6}
        width={w}
        height={h}
        rx={6}
        fill="#ffffff"
        stroke="#e2e8f0"
        strokeWidth={1}
      />
      <text
        x={x}
        y={y - h / 2 - 4}
        textAnchor="middle"
        fill="#0f172a"
        fontSize={11}
        fontWeight={700}
      >
        {text}
      </text>
    </g>
  )
}

type MeanDailyWaterLevelSectionProps = {
  /** Bumps whenever the monitoring page Refresh runs so this block reloads in sync (no duplicate toolbar). */
  refreshNonce?: number
}

export function MeanDailyWaterLevelSection({ refreshNonce = 0 }: MeanDailyWaterLevelSectionProps) {
  const [payload, setPayload] = useState<MeanDailyLevelsPayload | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [stationId, setStationId] = useState<string | null>(null)
  const [month, setMonth] = useState<string | null>(null)

  const load = useCallback(async () => {
    setErr(null)
    setLoading(true)
    try {
      const params = new URLSearchParams({ rangeDays: '548' })
      if (stationId === ALL_RIVERS) {
        params.set('stationId', 'all')
      } else if (stationId) {
        params.set('stationId', stationId)
      }
      if (month) params.set('month', month)
      const res = await fetch(`/api/hydrological/monitoring/mean-daily-levels?${params}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as MeanDailyLevelsPayload
      setPayload(json)
      if (json.stationId === 'all') {
        setStationId(ALL_RIVERS)
      } else if (json.stationId && stationId == null) {
        setStationId(json.stationId)
      }
    } catch {
      setErr('Could not load historical mean daily levels.')
      setPayload(null)
    } finally {
      setLoading(false)
    }
  }, [stationId, month])

  useEffect(() => {
    void load()
  }, [load, refreshNonce])

  const isMulti = payload?.mode === 'multi' || stationId === ALL_RIVERS
  const multiSeries = payload?.multiSeries ?? []
  const peakAnnotations = payload?.annotations?.peaks ?? []
  const singleData = payload?.series ?? []
  const stations = payload?.stations ?? []
  const availableMonths = payload?.availableMonths ?? []

  const mergedChartData = useMemo(() => {
    if (!isMulti || multiSeries.length === 0) return []
    return mergeMeanDailySeriesForChart(multiSeries)
  }, [isMulti, multiSeries])

  const chartDates = useMemo(() => {
    if (isMulti) {
      return mergedChartData.map((row) => String(row.date))
    }
    return singleData.map((d) => d.date)
  }, [isMulti, mergedChartData, singleData])

  const ymax = useMemo(() => {
    if (isMulti) {
      let max = 0
      for (const row of mergedChartData) {
        for (const entry of multiSeries) {
          const v = row[entry.stationId]
          if (typeof v === 'number' && Number.isFinite(v)) {
            max = Math.max(max, v)
          }
        }
      }
      return Math.max(10, max, 10.5)
    }
    return Math.max(10, ...singleData.map((d) => d.meanLevelM), 10.5)
  }, [isMulti, mergedChartData, multiSeries, singleData])

  const xTicks = useMemo(() => {
    if (chartDates.length > 30) return monthStartTicks(chartDates)
    return undefined
  }, [chartDates])

  const useMonthlyTicks = isMulti ? chartDates.length > 30 : chartDates.length > 90
  const useDenseVerticalDateTicks =
    !isMulti && chartDates.length > 30 && chartDates.length <= 90
  const showVerticalGrid = !isMulti && chartDates.length > 30
  const singleSparsePoint = !isMulti && singleData.length === 1
  const monthSelectValue = month ?? ALL_MONTHS
  const hasChartData = isMulti ? mergedChartData.length > 0 : singleData.length > 0

  const singleXAxisAngle = useDenseVerticalDateTicks
    ? -90
    : useMonthlyTicks
      ? 0
      : singleData.length > 12
        ? -40
        : 0
  const singleXAxisHeight = useDenseVerticalDateTicks
    ? 58
    : useMonthlyTicks
      ? 32
      : singleData.length > 12
        ? 46
        : 28
  const singleXAxisAnchor = useDenseVerticalDateTicks
    ? 'end'
    : useMonthlyTicks
      ? 'middle'
      : singleData.length > 12
        ? 'end'
        : 'middle'
  const singleXAxisInterval = useDenseVerticalDateTicks
    ? Math.max(0, Math.floor(singleData.length / 24))
    : useMonthlyTicks
      ? 0
      : singleData.length > 40
        ? Math.max(2, Math.floor(singleData.length / 18))
        : 0

  const selectValue =
    stationId === ALL_RIVERS
      ? ALL_RIVERS
      : stationId ?? payload?.stationId ?? ''

  return (
    <section className="mt-10" aria-label="Historical mean daily water level">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {err ? (
          <div className="bg-white px-4 py-8 text-center text-sm text-red-700 sm:px-6">{err}</div>
        ) : loading && !payload ? (
          <div className="flex flex-col items-center gap-2 bg-white px-4 py-12 text-slate-500">
            <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
            <p className="text-sm">Loading historical series…</p>
          </div>
        ) : stations.length === 0 ? (
          <div className="bg-white px-4 py-12 text-center text-sm text-slate-500 sm:px-6">
            No HoD-validated readings yet in this window — validated field and registry rows will populate
            this chart once submitted.
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4 sm:px-6">
              <div className="min-w-[200px] flex-1 space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  River
                </label>
                <Select
                  value={selectValue}
                  onValueChange={(id) => {
                    setStationId(id)
                    setMonth(null)
                  }}
                >
                  <SelectTrigger className="w-full max-w-md bg-white">
                    <SelectValue placeholder="Select river" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_RIVERS}>
                      All rivers ({stations.filter((s) => s.dayCount > 0).length})
                    </SelectItem>
                    {stations.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} — {s.district}
                        {s.dayCount > 0 ? ` (${s.dayCount} days)` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[180px] space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Month
                </label>
                <Select
                  value={monthSelectValue}
                  onValueChange={(v) => setMonth(v === ALL_MONTHS ? null : v)}
                >
                  <SelectTrigger className="w-full max-w-xs bg-white">
                    <SelectValue placeholder="All months" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_MONTHS}>All months in range</SelectItem>
                    {availableMonths.map((m) => (
                      <SelectItem key={m} value={m}>
                        {formatMonthLabel(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!hasChartData ? (
              <div className="bg-white px-4 py-12 text-center text-sm text-slate-500 sm:px-6">
                {isMulti
                  ? 'No validated readings for any river in the selected month.'
                  : 'No validated readings for this river in the selected month.'}
              </div>
            ) : (
              <>
                <div className={chartSurfaceClass}>
                  <h3 className="mb-1 text-center text-sm font-bold tracking-wide text-slate-900 sm:text-base">
                    Mean Daily Water Level (m)
                  </h3>
                  {isMulti ? (
                    <p className="mb-2 text-center text-xs font-medium text-slate-600 sm:text-sm">
                      Comparing {multiSeries.length} river{multiSeries.length === 1 ? '' : 's'}
                    </p>
                  ) : payload?.stationLabel ? (
                    <p className="mb-1 text-center text-xs font-medium text-slate-600 sm:text-sm">
                      {payload.stationLabel}
                    </p>
                  ) : null}
                  {singleSparsePoint ? (
                    <p className="mb-3 text-center text-xs text-amber-800/90 sm:text-sm">
                      One validated daily mean in this range — submit more HoD-validated readings on
                      other dates to see the trend line.
                    </p>
                  ) : null}

                  <div className="-mx-1 h-[min(280px,calc(100vw-6rem))] w-full sm:h-[min(300px,calc(100vw-7rem))]">
                    <ResponsiveContainer width="100%" height="100%">
                      {isMulti ? (
                        <LineChart
                          data={mergedChartData}
                          margin={{ top: 22, right: 12, bottom: useMonthlyTicks ? 8 : 6, left: 4 }}
                        >
                          <CartesianGrid
                            stroke="rgba(203,213,225,0.85)"
                            vertical={false}
                            strokeDasharray="4 6"
                          />
                          <XAxis
                            dataKey="date"
                            ticks={xTicks}
                            tick={{ fill: '#475569', fontSize: 10 }}
                            tickFormatter={(v: string) =>
                              useMonthlyTicks
                                ? formatMonthLabel(v.slice(0, 7))
                                : formatAxisDate(v)
                            }
                            stroke="#94a3b8"
                            tickLine={{ stroke: '#cbd5e1' }}
                            angle={useMonthlyTicks ? 0 : chartDates.length > 40 ? -40 : 0}
                            height={useMonthlyTicks ? 32 : chartDates.length > 40 ? 46 : 28}
                            textAnchor={
                              useMonthlyTicks ? 'middle' : chartDates.length > 40 ? 'end' : 'middle'
                            }
                            interval={
                              useMonthlyTicks
                                ? 0
                                : chartDates.length > 40
                                  ? Math.max(2, Math.floor(chartDates.length / 18))
                                  : 0
                            }
                            minTickGap={useMonthlyTicks ? 12 : 8}
                          />
                          <YAxis
                            domain={[0, ymax]}
                            tickCount={7}
                            tick={{ fill: '#475569', fontSize: 11 }}
                            stroke="#94a3b8"
                            tickLine={{ stroke: '#cbd5e1' }}
                            width={40}
                            label={{
                              value: 'm',
                              angle: -90,
                              position: 'insideLeft',
                              fill: '#64748b',
                              fontSize: 11,
                            }}
                          />
                          <Tooltip
                            cursor={TOOLTIP_CURSOR}
                            contentStyle={TOOLTIP_BOX_STYLE}
                            labelStyle={{ color: '#0f172a', fontWeight: 600 }}
                            labelFormatter={(label) =>
                              typeof label === 'string' ? formatAxisDate(label) : label
                            }
                            formatter={(value: number, name: string) => {
                              const entry = multiSeries.find((e) => e.stationId === name)
                              const label = entry?.stationLabel ?? name
                              return [`${value.toFixed(2)} m`, label]
                            }}
                          />
                          <Legend
                            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                            className="max-h-24 overflow-y-auto"
                          />
                          {multiSeries.map((entry, i) => (
                            <Line
                              key={entry.stationId}
                              type="monotone"
                              dataKey={entry.stationId}
                              name={entry.stationLabel}
                              stroke={STATION_LINE_COLORS[i % STATION_LINE_COLORS.length]}
                              strokeWidth={2}
                              dot={{ r: 2, strokeWidth: 1 }}
                              activeDot={{ r: 5 }}
                              connectNulls
                              isAnimationActive
                              animationDuration={600}
                            />
                          ))}
                        </LineChart>
                      ) : (
                        <ComposedChart
                          data={singleData}
                          margin={{
                            top: 28,
                            right: 12,
                            bottom: useDenseVerticalDateTicks ? 12 : useMonthlyTicks ? 8 : 6,
                            left: 4,
                          }}
                        >
                          <defs>
                            <linearGradient id="mdwlFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#fda4af" stopOpacity={0.35} />
                              <stop offset="35%" stopColor="#7dd3fc" stopOpacity={0.28} />
                              <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.12} />
                            </linearGradient>
                          </defs>

                          <CartesianGrid
                            stroke="rgba(203,213,225,0.85)"
                            vertical={showVerticalGrid}
                            strokeDasharray="4 6"
                          />

                          <XAxis
                            dataKey="date"
                            ticks={useDenseVerticalDateTicks ? undefined : xTicks}
                            tick={{ fill: '#475569', fontSize: 10 }}
                            tickFormatter={(v: string) =>
                              useMonthlyTicks
                                ? formatMonthLabel(v.slice(0, 7))
                                : formatAxisDate(v)
                            }
                            stroke="#94a3b8"
                            tickLine={{ stroke: '#cbd5e1' }}
                            angle={singleXAxisAngle}
                            height={singleXAxisHeight}
                            textAnchor={singleXAxisAnchor}
                            interval={singleXAxisInterval}
                            minTickGap={useDenseVerticalDateTicks ? 4 : useMonthlyTicks ? 12 : 8}
                          />
                          <YAxis
                            domain={[0, ymax]}
                            tickCount={7}
                            tick={{ fill: '#475569', fontSize: 11 }}
                            stroke="#94a3b8"
                            tickLine={{ stroke: '#cbd5e1' }}
                            width={40}
                            label={{
                              value: 'm',
                              angle: -90,
                              position: 'insideLeft',
                              fill: '#64748b',
                              fontSize: 11,
                            }}
                          />

                          <Tooltip
                            cursor={TOOLTIP_CURSOR}
                            contentStyle={TOOLTIP_BOX_STYLE}
                            labelStyle={{ color: '#0f172a', fontWeight: 600 }}
                            itemStyle={{ color: '#0284c7' }}
                            labelFormatter={(label) =>
                              typeof label === 'string' ? formatAxisDate(label) : label
                            }
                            formatter={(value: number) => meanStageTooltipValue(value)}
                          />

                          <Area
                            type="monotone"
                            dataKey="meanLevelM"
                            stroke="none"
                            fill="url(#mdwlFill)"
                            fillOpacity={1}
                            isAnimationActive
                            animationDuration={900}
                            connectNulls
                          />

                          <Line
                            type="monotone"
                            dataKey="meanLevelM"
                            stroke="#0284c7"
                            strokeWidth={2}
                            dot={{ r: 3, stroke: '#ea580c', strokeWidth: 2, fill: '#ffffff' }}
                            activeDot={{ r: 6, stroke: '#f59e0b', strokeWidth: 2, fill: '#fff' }}
                            connectNulls
                            isAnimationActive
                            animationDuration={900}
                          />

                          {peakAnnotations.map((p, i) => (
                            <ReferenceDot
                              key={`${p.date}-${i}`}
                              x={p.date}
                              y={p.meanLevelM}
                              r={7}
                              fill="#ffffff"
                              stroke="#ea580c"
                              strokeWidth={2.5}
                              ifOverflow="extendDomain"
                              label={
                                <Label
                                  content={(labelProps) => (
                                    <PeakCalloutLabel
                                      viewBox={labelProps.viewBox}
                                      value={`${formatAxisDate(p.date)} · ${p.meanLevelM.toFixed(2)} m`}
                                    />
                                  )}
                                  position="top"
                                  offset={16}
                                />
                              }
                            />
                          ))}
                        </ComposedChart>
                      )}
                    </ResponsiveContainer>
                  </div>

                  <p className="mt-2 text-center text-xs font-medium text-slate-500 sm:text-[13px]">
                    {payload?.dataRangeCaption ?? ''}
                  </p>
                </div>

                <div className="grid divide-y divide-slate-200 border-t border-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                  <div className="flex items-start gap-3 bg-slate-50/80 px-4 py-3 text-slate-900 sm:px-5">
                    <ChartColumnIncreasing
                      className="mt-0.5 h-7 w-7 shrink-0 text-sky-600"
                      strokeWidth={2}
                      aria-hidden
                    />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Peak period
                      </p>
                      <p className="text-sm font-semibold text-slate-800">
                        {payload?.peakSummary ?? '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-slate-50/80 px-4 py-3 text-slate-900 sm:px-5">
                    <TrendingDown
                      className="mt-0.5 h-7 w-7 shrink-0 text-orange-600"
                      strokeWidth={2}
                      aria-hidden
                    />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Lowest period
                      </p>
                      <p className="text-sm font-semibold text-slate-800">
                        {payload?.lowSummary ?? '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </section>
  )
}
