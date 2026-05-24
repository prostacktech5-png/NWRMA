'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Loader2,
  MapPin,
  Minus,
  Radio,
  RefreshCw,
  Siren,
  TrendingDown,
  TrendingUp,
  Waves,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ExcelColumnFilter,
  matchesExcelSet,
} from '@/components/hydro/excel-column-filter'
import { FloodForecastingCharts } from '@/components/hydro/flood-forecasting-charts'
import type {
  MonitoringDashboardPayload,
  MonitoringDataStationsItem,
  MonitoringFloodRisk,
} from '@/lib/hydro-monitoring-dashboard-types'
import {
  bandLabel,
  buildAlertsFromStations,
  buildBasinSummary,
  riskSortScore,
  riskToBand,
  type RiskBandUi,
} from '@/lib/flood-forecasting-utils'
import { cn } from '@/lib/utils'

const MonitoringStationsMap = dynamic(
  () => import('@/components/hydro/monitoring-stations-map'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[360px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading map…
      </div>
    ),
  },
)

const RISK_ORDER: MonitoringFloodRisk[] = ['critical', 'high', 'medium', 'low']
const RISK_LABELS: Record<MonitoringFloodRisk, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

function bandBadgeClass(band: RiskBandUi): string {
  if (band === 'danger') return 'bg-red-100 text-red-800 border-red-200'
  if (band === 'warning') return 'bg-amber-100 text-amber-900 border-amber-200'
  return 'bg-emerald-100 text-emerald-800 border-emerald-200'
}

function TrendCell({ trend }: { trend: MonitoringDataStationsItem['trend'] }) {
  if (trend === 'rising') {
    return (
      <span className="inline-flex items-center gap-1 font-medium text-red-600">
        <TrendingUp className="h-4 w-4" /> Rising
      </span>
    )
  }
  if (trend === 'falling') {
    return (
      <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
        <TrendingDown className="h-4 w-4" /> Falling
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 font-medium text-slate-500">
      <Minus className="h-4 w-4" /> Stable
    </span>
  )
}

function KpiCard({
  title,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  title: string
  value: string
  sub: string
  icon: React.ComponentType<{ className?: string }>
  accent: 'blue' | 'green' | 'amber' | 'red' | 'slate'
}) {
  const accents = {
    blue: 'border-l-sky-500 bg-sky-50/40',
    green: 'border-l-emerald-500 bg-emerald-50/40',
    amber: 'border-l-amber-500 bg-amber-50/40',
    red: 'border-l-red-500 bg-red-50/40',
    slate: 'border-l-slate-500 bg-slate-50/40',
  }
  const iconColors = {
    blue: 'text-sky-600',
    green: 'text-emerald-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
    slate: 'text-slate-600',
  }
  return (
    <div
      className={cn(
        'flex items-start justify-between rounded-lg border border-slate-200 border-l-4 bg-white p-4 shadow-sm',
        accents[accent],
      )}
    >
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
        <p className="mt-0.5 text-xs text-slate-600">{sub}</p>
      </div>
      <Icon className={cn('h-8 w-8 shrink-0 opacity-90', iconColors[accent])} />
    </div>
  )
}

function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

export function FloodForecastingDashboard({
  dashboard,
  totalRegistryStations,
  activeFloodAlerts,
  isLoading,
  refreshing,
  onRefresh,
  refreshNonce,
}: {
  dashboard: MonitoringDashboardPayload | null
  totalRegistryStations: number
  activeFloodAlerts: number
  isLoading: boolean
  refreshing: boolean
  onRefresh: () => void
  refreshNonce: number
}) {
  const stations = dashboard?.stations ?? []

  const [mapRegion, setMapRegion] = useState<string>('all')
  const [chartStationId, setChartStationId] = useState<string | null>(null)
  const [selectedRisks, setSelectedRisks] = useState<Set<string>>(() => new Set())
  const [selectedRegions, setSelectedRegions] = useState<Set<string>>(() => new Set())
  const [filtersReady, setFiltersReady] = useState(false)

  const riskOptions = useMemo(() => {
    const present = new Set(stations.map((s) => s.floodRisk))
    return RISK_ORDER.filter((r) => present.has(r)).map((r) => ({
      value: r,
      label: RISK_LABELS[r],
    }))
  }, [stations])

  const allRisks = useMemo(() => riskOptions.map((o) => o.value), [riskOptions])

  const regionOptions = useMemo(() => {
    const set = new Set(stations.map((s) => s.region).filter(Boolean))
    return [...set]
      .sort((a, b) => a.localeCompare(b))
      .map((r) => ({ value: r, label: r }))
  }, [stations])

  const allRegions = useMemo(() => regionOptions.map((o) => o.value), [regionOptions])

  useEffect(() => {
    if (!stations.length) return
    if (!filtersReady) {
      setSelectedRisks(new Set(allRisks))
      setSelectedRegions(new Set(allRegions))
      setFiltersReady(true)
    }
  }, [stations.length, allRisks, allRegions, filtersReady])

  useEffect(() => {
    if (!chartStationId && stations.length > 0) {
      const top = [...stations].sort(
        (a, b) => riskSortScore(b.floodRisk) - riskSortScore(a.floodRisk),
      )[0]
      if (top) setChartStationId(top.id)
    }
  }, [stations, chartStationId])

  const mapStations = useMemo(() => {
    if (mapRegion === 'all') return stations
    return stations.filter((s) => s.region === mapRegion)
  }, [stations, mapRegion])

  const filteredStations = useMemo(() => {
    const risks = filtersReady ? selectedRisks : new Set(allRisks)
    const regions = filtersReady ? selectedRegions : new Set(allRegions)
    return stations.filter((s) => {
      if (!matchesExcelSet(s.floodRisk, risks, allRisks)) return false
      if (!matchesExcelSet(s.region, regions, allRegions)) return false
      if (mapRegion !== 'all' && s.region !== mapRegion) return false
      return true
    })
  }, [
    stations,
    selectedRisks,
    selectedRegions,
    allRisks,
    allRegions,
    filtersReady,
    mapRegion,
  ])

  const counts = useMemo(() => {
    let normal = 0
    let warning = 0
    let danger = 0
    for (const s of stations) {
      const b = riskToBand(s.floodRisk)
      if (b === 'normal') normal += 1
      else if (b === 'warning') warning += 1
      else danger += 1
    }
    const total = stations.length
    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0)
    return { normal, warning, danger, total, pct }
  }, [stations])

  const topAtRisk = useMemo(
    () =>
      [...filteredStations]
        .sort((a, b) => riskSortScore(b.floodRisk) - riskSortScore(a.floodRisk))
        .slice(0, 6),
    [filteredStations],
  )

  const basinRows = useMemo(() => buildBasinSummary(filteredStations), [filteredStations])
  const alerts = useMemo(
    () => buildAlertsFromStations(filteredStations, dashboard?.lastUpdated ?? new Date().toISOString()),
    [filteredStations, dashboard?.lastUpdated],
  )

  const nowLabel = new Date().toLocaleString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const lastUpdatedLabel = dashboard?.lastUpdated
    ? new Date(dashboard.lastUpdated).toLocaleString('en-GB')
    : '—'

  if (isLoading && !dashboard) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Loading flood forecasting dashboard…</p>
      </div>
    )
  }

  if (!dashboard || stations.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-12 text-center shadow-sm">
        <Waves className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p className="font-medium text-slate-800">No stations with validated readings yet</p>
        <p className="mt-1 text-sm text-slate-500">
          Validate readings on the readings register to populate this dashboard.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5 bg-white">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            River flood forecasting dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time monitoring &amp; forecasting — HoD-validated readings
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <span className="tabular-nums">{nowLabel}</span>
          <span className="hidden text-slate-300 sm:inline">|</span>
          <span>
            Last updated: <strong className="font-medium text-slate-800">{lastUpdatedLabel}</strong>
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 border-slate-200"
            onClick={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </Button>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {activeFloodAlerts > 0 ? `${activeFloodAlerts} active alert(s)` : 'Systems operational'}
          </span>
        </div>
      </header>

      {dashboard.alertCount > 0 ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-900"
        >
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-semibold">
            {dashboard.alertCount} flood alert(s) active — immediate review required
          </p>
        </div>
      ) : null}

      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          title="Monitored stations"
          value={`${counts.total}`}
          sub={
            totalRegistryStations > counts.total
              ? `${counts.total} active of ${totalRegistryStations} registered`
              : `${counts.total} with validated data`
          }
          icon={Radio}
          accent="blue"
        />
        <KpiCard
          title="Normal"
          value={`${counts.normal}`}
          sub={`${counts.pct(counts.normal)}% of network`}
          icon={CheckCircle2}
          accent="green"
        />
        <KpiCard
          title="Warning"
          value={`${counts.warning}`}
          sub={`${counts.pct(counts.warning)}% of network`}
          icon={AlertTriangle}
          accent="amber"
        />
        <KpiCard
          title="Danger"
          value={`${counts.danger}`}
          sub={`${counts.pct(counts.danger)}% of network`}
          icon={Siren}
          accent="red"
        />
        <KpiCard
          title="Districts monitored"
          value={`${allRegions.length}`}
          sub="River monitoring districts"
          icon={MapPin}
          accent="slate"
        />
      </div>

      {/* Excel filters */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Filters</span>
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
      </div>

      {/* Map + top at-risk table */}
      <div className="grid gap-4 xl:grid-cols-5">
        <Panel
          title="River basin overview"
          className="xl:col-span-3"
          action={
            <Select value={mapRegion} onValueChange={setMapRegion}>
              <SelectTrigger className="h-8 w-[140px] border-slate-200 text-xs">
                <SelectValue placeholder="All districts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All districts</SelectItem>
                {allRegions.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        >
          <MonitoringStationsMap
            stations={mapStations}
            showHeaderLegend={false}
            mapClassName="z-0 h-[360px] w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
          />
        </Panel>

        <Panel
          title="Top stations at risk"
          className="xl:col-span-2"
          action={
            <span className="text-xs text-slate-500">{filteredStations.length} stations</span>
          }
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs">Station</TableHead>
                  <TableHead className="text-xs">District</TableHead>
                  <TableHead className="text-right text-xs">Level (m)</TableHead>
                  <TableHead className="text-xs">Risk</TableHead>
                  <TableHead className="text-xs">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topAtRisk.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-slate-500">
                      No stations match filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  topAtRisk.map((s) => {
                    const band = riskToBand(s.floodRisk)
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="max-w-[120px] truncate text-xs font-medium">
                          {s.station}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">{s.region}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums font-semibold">
                          {s.latestLevel.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase',
                              bandBadgeClass(band),
                            )}
                          >
                            {bandLabel(band)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <TrendCell trend={s.trend} />
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Panel>
      </div>

      {/* Charts + alerts */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <FloodForecastingCharts
            stations={filteredStations}
            selectedStationId={chartStationId}
            onStationChange={setChartStationId}
            refreshNonce={refreshNonce}
          />
        </div>

        <Panel title="Alerts &amp; notifications">
          <ul className="max-h-[420px] space-y-3 overflow-y-auto">
            {alerts.slice(0, 8).map((a) => (
              <li
                key={a.id}
                className={cn(
                  'flex gap-3 rounded-lg border px-3 py-2.5',
                  a.severity === 'danger' && 'border-red-100 bg-red-50/50',
                  a.severity === 'warning' && 'border-amber-100 bg-amber-50/50',
                  a.severity === 'info' && 'border-slate-100 bg-slate-50/50',
                )}
              >
                <Bell
                  className={cn(
                    'mt-0.5 h-4 w-4 shrink-0',
                    a.severity === 'danger' && 'text-red-600',
                    a.severity === 'warning' && 'text-amber-600',
                    a.severity === 'info' && 'text-sky-600',
                  )}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{a.title}</p>
                  <p className="text-xs text-slate-600">{a.description}</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {new Date(a.at).toLocaleString('en-GB')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Basin summary */}
      <Panel title="District summary">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>District</TableHead>
                <TableHead className="text-center">Stations</TableHead>
                <TableHead className="text-center text-emerald-700">Normal</TableHead>
                <TableHead className="text-center text-amber-700">Warning</TableHead>
                <TableHead className="text-center text-red-700">Danger</TableHead>
                <TableHead className="text-right">Highest level (m)</TableHead>
                <TableHead>Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {basinRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-500">
                    No data for current filters.
                  </TableCell>
                </TableRow>
              ) : (
                basinRows.map((row) => (
                  <TableRow key={row.region}>
                    <TableCell className="font-medium">{row.region}</TableCell>
                    <TableCell className="text-center tabular-nums">{row.total}</TableCell>
                    <TableCell className="text-center tabular-nums text-emerald-700">
                      {row.normal}
                    </TableCell>
                    <TableCell className="text-center tabular-nums text-amber-700">
                      {row.warning}
                    </TableCell>
                    <TableCell className="text-center tabular-nums text-red-700">
                      {row.danger}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.highestLevel.toFixed(2)}
                      <span className="block text-[10px] font-normal text-slate-500">
                        {row.highestStation}
                      </span>
                    </TableCell>
                    <TableCell>
                      <TrendCell trend={row.trend} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Panel>
    </div>
  )
}
