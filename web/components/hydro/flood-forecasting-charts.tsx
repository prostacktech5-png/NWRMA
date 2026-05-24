'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Loader2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { MonitoringDataStationsItem } from '@/lib/hydro-monitoring-dashboard-types'
import { estimateDailyRate, thresholdLines } from '@/lib/flood-forecasting-utils'

type MeanDailyPoint = { date: string; meanLevelM: number }

function formatShortDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

type ChartRow = {
  date: string
  observed?: number
  forecast?: number
  label: string
}

function buildTrendRows(series: MeanDailyPoint[]): ChartRow[] {
  return series.slice(-7).map((p) => ({
    date: p.date,
    observed: p.meanLevelM,
    label: formatShortDate(p.date),
  }))
}

function buildForecastRows(
  series: MeanDailyPoint[],
  station: MonitoringDataStationsItem,
): ChartRow[] {
  const last7 = series.slice(-7)
  if (last7.length === 0) return []

  const rate = estimateDailyRate(station.levelHistory, station.trend)
  const rows: ChartRow[] = last7.map((p) => ({
    date: p.date,
    observed: p.meanLevelM,
    label: formatShortDate(p.date),
  }))

  const last = last7[last7.length - 1]!
  let level = last.meanLevelM
  for (let i = 1; i <= 3; i++) {
    level += rate
    rows.push({
      date: addDays(last.date, i),
      forecast: Math.max(0, level),
      label: formatShortDate(addDays(last.date, i)),
    })
  }

  const bridge = rows.find((r) => r.date === last.date)
  if (bridge) bridge.forecast = last.meanLevelM

  return rows
}

function ThresholdChart({
  title,
  rows,
  thresholdM,
  loading,
}: {
  title: string
  rows: ChartRow[]
  thresholdM: number
  loading: boolean
}) {
  const lines = thresholdLines(thresholdM)
  const ymax = useMemo(() => {
    const vals = rows.flatMap((r) => [r.observed, r.forecast].filter((v) => v != null)) as number[]
    const maxVal = vals.length ? Math.max(...vals, lines.danger) : lines.danger
    return Math.ceil(maxVal * 1.15 * 10) / 10
  }, [rows, lines.danger])

  const showForecast = rows.some((r) => r.forecast != null && r.observed == null)

  return (
    <div className="flex h-full flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="relative min-h-[240px] flex-1 p-3">
        {loading ? (
          <div className="flex h-[220px] items-center justify-center text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex h-[220px] items-center justify-center text-sm text-slate-500">
            No validated daily readings for this station yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#64748b', fontSize: 10 }}
                stroke="#cbd5e1"
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, ymax]}
                tick={{ fill: '#64748b', fontSize: 10 }}
                stroke="#cbd5e1"
                width={36}
              />
              <Tooltip
                contentStyle={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number, name: string) => [
                  `${Number(value).toFixed(2)} m`,
                  name === 'observed' ? 'Observed' : 'Forecast',
                ]}
              />
              <ReferenceLine
                y={lines.danger}
                stroke="#dc2626"
                strokeDasharray="6 4"
                label={{ value: 'Danger', fill: '#dc2626', fontSize: 10, position: 'insideTopRight' }}
              />
              <ReferenceLine
                y={lines.warning}
                stroke="#f59e0b"
                strokeDasharray="6 4"
                label={{ value: 'Warning', fill: '#d97706', fontSize: 10, position: 'insideTopRight' }}
              />
              <ReferenceLine
                y={lines.normal}
                stroke="#16a34a"
                strokeDasharray="6 4"
                label={{ value: 'Normal', fill: '#16a34a', fontSize: 10, position: 'insideTopRight' }}
              />
              <Line
                type="monotone"
                dataKey="observed"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 3, fill: '#2563eb' }}
                connectNulls
                name="observed"
              />
              {showForecast ? (
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="#9333ea"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={{ r: 3, fill: '#9333ea' }}
                  connectNulls
                  name="forecast"
                />
              ) : null}
              {showForecast ? (
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(value) => (value === 'observed' ? 'Observed' : 'Forecast')}
                />
              ) : null}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export function FloodForecastingCharts({
  stations,
  selectedStationId,
  onStationChange,
  refreshNonce,
}: {
  stations: MonitoringDataStationsItem[]
  selectedStationId: string | null
  onStationChange: (id: string) => void
  refreshNonce: number
}) {
  const [series, setSeries] = useState<MeanDailyPoint[]>([])
  const [loading, setLoading] = useState(false)

  const station =
    stations.find((s) => s.id === selectedStationId) ?? stations[0] ?? null

  const loadSeries = useCallback(async () => {
    if (!station) {
      setSeries([])
      return
    }
    setLoading(true)
    try {
      const params = new URLSearchParams({ rangeDays: '14', stationId: station.id })
      const res = await fetch(`/api/hydrological/monitoring/mean-daily-levels?${params}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      })
      if (!res.ok) throw new Error('fetch failed')
      const json = (await res.json()) as { series?: MeanDailyPoint[] }
      setSeries(json.series ?? [])
    } catch {
      setSeries([])
    } finally {
      setLoading(false)
    }
  }, [station])

  useEffect(() => {
    void loadSeries()
  }, [loadSeries, refreshNonce])

  const trendRows = useMemo(() => buildTrendRows(series), [series])
  const forecastRows = useMemo(
    () => (station ? buildForecastRows(series, station) : []),
    [series, station],
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Station charts</p>
        <Select
          value={station?.id ?? undefined}
          onValueChange={onStationChange}
          disabled={stations.length === 0}
        >
          <SelectTrigger className="h-8 w-full max-w-xs border-slate-200 bg-white text-sm sm:w-64">
            <SelectValue placeholder="Select station" />
          </SelectTrigger>
          <SelectContent>
            {stations.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.station} — {s.region}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ThresholdChart
          title="Water level trend (last 7 days)"
          rows={trendRows}
          thresholdM={station?.threshold ?? 1}
          loading={loading}
        />
        <ThresholdChart
          title="Forecasted water level (next 3 days)"
          rows={forecastRows}
          thresholdM={station?.threshold ?? 1}
          loading={loading}
        />
      </div>
      <p className="text-[11px] text-slate-500">
        Forecast uses recent validated readings and the station trend. Threshold lines: normal 70%,
        warning 85%, danger 100%.
      </p>
    </div>
  )
}
