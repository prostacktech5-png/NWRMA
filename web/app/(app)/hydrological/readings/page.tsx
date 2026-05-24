'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { waterLevelBand } from '@nwrma/shared'
import type { FieldReportResponse } from '@nwrma/shared'
import {
  Search,
  Filter,
  Download,
  MapPin,
  CircleCheck,
  CircleX,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAppBranding } from '@/components/app-branding-provider'
import { Label } from '@/components/ui/label'
import { formatDate, formatTime } from '@/lib/mock-data'
import { fieldReportToWaterLevelReading } from '@/lib/field-report-mapper'
import type { WaterLevelReading } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  buildReadingsExportFilename,
  buildReadingsFilterLabel,
  readingMatchesPeriod,
  toDateInputValue,
  toMonthInputValue,
  type ReadingPeriodFilter,
} from '@/lib/water-level-readings-csv'
import { buildWaterReadingsExportMeta } from '@/lib/water-level-readings-export-meta'

function parseReading(raw: Record<string, unknown>): WaterLevelReading {
  const levelRaw =
    raw.levelM ??
    raw.level_m ??
    raw.water_level ??
    raw.waterLevel ??
    raw.stage_m ??
    raw.water_depth ??
    raw.depth_m ??
    raw.level ??
    raw.depth ??
    raw.reading
  const levelM =
    typeof levelRaw === 'number' && Number.isFinite(levelRaw)
      ? levelRaw
      : Number(String(levelRaw ?? '').replace(',', '.')) || 0

  const gpsRaw =
    raw.gpsLocation ?? raw.gps_location ?? raw.gps ?? raw.coordinates ?? ''
  const gpsLocation = typeof gpsRaw === 'string' ? gpsRaw : String(gpsRaw ?? '')

  const measuredRaw =
    raw.measuredAt ??
    raw.measured_at ??
    raw.timestamp ??
    raw.readingTimestamp ??
    raw.datetime
  let measuredAt: Date
  if (measuredRaw instanceof Date) {
    measuredAt = measuredRaw
  } else if (typeof measuredRaw === 'number' && Number.isFinite(measuredRaw)) {
    measuredAt = new Date(measuredRaw > 1e12 ? measuredRaw : measuredRaw * 1000)
  } else {
    measuredAt = new Date(String(measuredRaw ?? ''))
  }
  if (Number.isNaN(measuredAt.getTime())) {
    measuredAt = new Date(0)
  }

  const createdRaw = raw.createdAt ?? raw.created_at
  let createdAt: Date
  if (createdRaw instanceof Date) {
    createdAt = createdRaw
  } else if (typeof createdRaw === 'number' && Number.isFinite(createdRaw)) {
    createdAt = new Date(createdRaw > 1e12 ? createdRaw : createdRaw * 1000)
  } else {
    createdAt = new Date(String(createdRaw ?? ''))
  }
  if (Number.isNaN(createdAt.getTime())) {
    createdAt = new Date(0)
  }

  return {
    ...(raw as unknown as WaterLevelReading),
    levelM,
    gpsLocation,
    measuredAt,
    createdAt,
  }
}

export default function HydrologicalReadingsPage() {
  const { branding } = useAppBranding()
  const [searchQuery, setSearchQuery] = useState('')
  const [readings, setReadings] = useState<WaterLevelReading[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [periodFilter, setPeriodFilter] = useState<ReadingPeriodFilter>('all')
  const [filterAnchor, setFilterAnchor] = useState(() => new Date())
  const [locationFilter, setLocationFilter] = useState('all')
  const [exportBusy, setExportBusy] = useState<'pdf' | 'xlsx' | null>(null)

  const loadReadings = useCallback(async () => {
    setLoadError(null)
    let primaryFailed = false
    let merged: WaterLevelReading[] = []

    try {
      const res = await fetch('/api/hydrological/readings', { cache: 'no-store', credentials: 'same-origin' })
      if (!res.ok) primaryFailed = true
      else {
        const data = await res.json()
        merged = ((data.readings as Record<string, unknown>[]) ?? []).map(parseReading)
      }
    } catch {
      primaryFailed = true
    }

    try {
      const r = await fetch('/api/integrations/nwrma/reports', {
        cache: 'no-store',
        credentials: 'same-origin',
      })
      if (r.ok) {
        const payload = await r.json()
        const reports = payload.reports as FieldReportResponse[] | undefined
        if (reports?.length) {
          const mapped = reports.map(fieldReportToWaterLevelReading)
          const seen = new Set(merged.map((x) => x.id))
          for (const m of mapped) {
            if (!seen.has(m.id)) {
              merged.push(m)
              seen.add(m.id)
            }
          }
        }
      }
    } catch {
      /* remote optional */
    }

    setReadings(merged)
    if (primaryFailed && merged.length === 0) {
      setLoadError('Could not load readings from the server.')
    }
  }, [])

  useEffect(() => {
    void loadReadings()
  }, [loadReadings])

  const locationOptions = useMemo(() => {
    const names = new Set<string>()
    for (const reading of readings) {
      const loc = reading.location.trim()
      if (loc) names.add(loc)
    }
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [readings])

  const filtersActive = periodFilter !== 'all' || locationFilter !== 'all'

  const filteredReadings = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return readings.filter((reading) => {
      if (locationFilter !== 'all' && reading.location !== locationFilter) return false
      if (!readingMatchesPeriod(reading, periodFilter, filterAnchor)) return false
      if (!q) return true
      return (
        reading.officerName.toLowerCase().includes(q) ||
        reading.phoneNumber.toLowerCase().includes(q) ||
        reading.location.toLowerCase().includes(q) ||
        reading.gpsLocation.toLowerCase().includes(q) ||
        reading.stationName.toLowerCase().includes(q) ||
        reading.createdBy.toLowerCase().includes(q)
      )
    })
  }, [readings, searchQuery, locationFilter, periodFilter, filterAnchor])

  function clearFilters() {
    setPeriodFilter('all')
    setLocationFilter('all')
    setFilterAnchor(new Date())
  }

  const exportFilterLabel = useMemo(
    () => buildReadingsFilterLabel(periodFilter, filterAnchor, locationFilter),
    [periodFilter, filterAnchor, locationFilter]
  )

  const exportMeta = useMemo(() => buildWaterReadingsExportMeta(branding), [branding])

  async function onDownloadReadings(format: 'pdf' | 'xlsx') {
    if (filteredReadings.length === 0 || exportBusy) return
    setExportBusy(format)
    try {
      const filename = buildReadingsExportFilename(
        periodFilter,
        filterAnchor,
        locationFilter,
        format
      )
      if (format === 'pdf') {
        const [{ downloadWaterLevelReadingsPdf }, { resolveReportLogoForPdf }] =
          await Promise.all([
            import('@/lib/water-level-readings-pdf'),
            import('@/lib/hydro-activity-report-pdf-logo'),
          ])
        const logo = await resolveReportLogoForPdf(branding)
        downloadWaterLevelReadingsPdf(filename, filteredReadings, exportFilterLabel, {
          logo,
          meta: exportMeta,
        })
      } else {
        const { downloadWaterLevelReadingsXlsx } = await import('@/lib/water-level-readings-xlsx')
        downloadWaterLevelReadingsXlsx(filename, filteredReadings, exportFilterLabel, exportMeta)
      }
    } finally {
      setExportBusy(null)
    }
  }

  const totalLocationStations = new Set(filteredReadings.map((r) => r.stationId)).size
  const rejectedReadings = filteredReadings.filter((r) => r.hodValidation === 'rejected').length

  const filteredBandStats = filteredReadings.reduce(
    (acc, r) => {
      acc[waterLevelBand(r.levelM)] += 1
      return acc
    },
    { low: 0, medium: 0, high: 0 }
  )

  async function onValidate(reading: WaterLevelReading, value: 'valid' | 'reject') {
    if (reading.gaugeOfficerId === 'nwrma-api') return
    setSavingId(reading.id)
    const hodValidation = value === 'valid' ? 'valid' : 'rejected'
    try {
      const res = await fetch(`/api/hydrological/readings/${reading.id}/validation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hodValidation }),
      })
      if (!res.ok) return
      const data = await res.json()
      const next = parseReading(data.reading as Record<string, unknown>)
      setReadings((prev) => prev.map((r) => (r.id === next.id ? next : r)))
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Water level readings</h1>

      {loadError ? (
        <p className="text-sm text-destructive" role="alert">
          {loadError}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Water level readings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredReadings.length}</div>
            <p className="text-xs text-muted-foreground">In filtered view</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total location stations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{totalLocationStations}</span>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">Distinct stations (filtered view)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total rejected readings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{rejectedReadings}</span>
              <CircleX className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-xs text-muted-foreground">HoD marked reject</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Level bands (m)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Low&nbsp;0–3 · Med&nbsp;3–6 · High&nbsp;≥6 — counts for filtered rows
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold tabular-nums">
              <span>
                Low: <span className="text-muted-foreground">{filteredBandStats.low}</span>
              </span>
              <span>
                Med:{' '}
                <span className="text-muted-foreground">{filteredBandStats.medium}</span>
              </span>
              <span>
                High:{' '}
                <span className="text-muted-foreground">{filteredBandStats.high}</span>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Reading History</CardTitle>
            <CardDescription>All recorded water level measurements</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search readings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 sm:w-64"
              />
            </div>
            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  aria-label="Filter readings"
                  className={cn(filtersActive && 'border-primary text-primary')}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Filter readings</p>
                  <p className="text-xs text-muted-foreground">
                    Narrow by time period and location. PDF and Excel downloads use the same filters.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reading-period-filter">Time period</Label>
                  <Select
                    value={periodFilter}
                    onValueChange={(value) => setPeriodFilter(value as ReadingPeriodFilter)}
                  >
                    <SelectTrigger id="reading-period-filter" className="w-full">
                      <SelectValue placeholder="All time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All time</SelectItem>
                      <SelectItem value="day">By day</SelectItem>
                      <SelectItem value="week">By week</SelectItem>
                      <SelectItem value="month">By month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {periodFilter === 'day' ? (
                  <div className="space-y-2">
                    <Label htmlFor="reading-day-filter">Date</Label>
                    <Input
                      id="reading-day-filter"
                      type="date"
                      value={toDateInputValue(filterAnchor)}
                      onChange={(e) => {
                        if (!e.target.value) return
                        setFilterAnchor(new Date(`${e.target.value}T12:00:00`))
                      }}
                    />
                  </div>
                ) : null}
                {periodFilter === 'week' ? (
                  <div className="space-y-2">
                    <Label htmlFor="reading-week-filter">Week containing</Label>
                    <Input
                      id="reading-week-filter"
                      type="date"
                      value={toDateInputValue(filterAnchor)}
                      onChange={(e) => {
                        if (!e.target.value) return
                        setFilterAnchor(new Date(`${e.target.value}T12:00:00`))
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Shows readings from Monday through Sunday of that week.
                    </p>
                  </div>
                ) : null}
                {periodFilter === 'month' ? (
                  <div className="space-y-2">
                    <Label htmlFor="reading-month-filter">Month</Label>
                    <Input
                      id="reading-month-filter"
                      type="month"
                      value={toMonthInputValue(filterAnchor)}
                      onChange={(e) => {
                        if (!e.target.value) return
                        setFilterAnchor(new Date(`${e.target.value}-01T12:00:00`))
                      }}
                    />
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="reading-location-filter">Location</Label>
                  <Select value={locationFilter} onValueChange={setLocationFilter}>
                    <SelectTrigger id="reading-location-filter" className="w-full">
                      <SelectValue placeholder="All locations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All locations</SelectItem>
                      {locationOptions.map((location) => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="ghost" size="sm" type="button" onClick={clearFilters}>
                    Clear
                  </Button>
                  <Button size="sm" type="button" onClick={() => setFiltersOpen(false)}>
                    Done
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  aria-label="Download readings"
                  disabled={filteredReadings.length === 0 || exportBusy !== null}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  disabled={exportBusy !== null}
                  onClick={() => void onDownloadReadings('pdf')}
                >
                  {exportBusy === 'pdf' ? 'Preparing PDF…' : 'Download PDF'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={exportBusy !== null}
                  onClick={() => void onDownloadReadings('xlsx')}
                >
                  {exportBusy === 'xlsx' ? 'Preparing Excel…' : 'Download Excel (.xlsx)'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <Table
            containerClassName="max-w-full overflow-x-auto rounded-md border border-border"
            className={cn(
              'table-fixed min-w-[920px] w-full border-collapse border-0 text-sm',
              '[&_th]:border [&_th]:border-border [&_td]:border [&_td]:border-border',
              '[&_thead_th]:bg-muted/70 [&_thead_th]:font-semibold [&_thead_th]:text-foreground'
            )}
          >
            <colgroup>
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '19%' }} />
              <col style={{ width: '8%' }} />
            </colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead
                  scope="col"
                  className="h-auto min-h-10 whitespace-normal px-2 py-2 text-xs align-middle"
                >
                  Name of the officer
                </TableHead>
                <TableHead
                  scope="col"
                  className="h-auto min-h-10 whitespace-normal px-2 py-2 text-xs align-middle"
                >
                  Phone
                </TableHead>
                <TableHead
                  scope="col"
                  className="h-auto min-h-10 whitespace-normal px-2 py-2 text-xs align-middle"
                >
                  Location
                </TableHead>
                <TableHead
                  scope="col"
                  className="h-auto min-h-10 whitespace-nowrap px-2 py-2 text-xs align-middle"
                >
                  Level&nbsp;(m)
                </TableHead>
                <TableHead
                  scope="col"
                  className="h-auto min-h-10 whitespace-nowrap px-2 py-2 text-xs align-middle"
                >
                  Time
                </TableHead>
                <TableHead
                  scope="col"
                  className="h-auto min-h-10 whitespace-nowrap px-2 py-2 text-xs align-middle"
                >
                  Date
                </TableHead>
                <TableHead
                  scope="col"
                  className="h-auto min-h-10 whitespace-normal px-2 py-2 text-xs align-middle"
                >
                  GPS
                </TableHead>
                <TableHead
                  scope="col"
                  className="h-auto min-h-10 whitespace-nowrap px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground align-middle"
                >
                  HoD validation
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReadings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    No readings match your search or filters.
                  </TableCell>
                </TableRow>
              ) : null}
              {filteredReadings.map((reading) => {
                const selectValue =
                  reading.hodValidation === 'pending'
                    ? undefined
                    : reading.hodValidation === 'valid'
                      ? 'valid'
                      : 'reject'
                return (
                  <TableRow key={reading.id} className="hover:bg-muted/30">
                    <TableCell className="max-w-0 px-2 py-2 align-middle">
                      <span
                        className="block truncate text-xs font-medium leading-tight sm:text-sm"
                        title={reading.officerName}
                      >
                        {reading.officerName}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-0 px-2 py-2 align-middle">
                      <span
                        className="block truncate whitespace-nowrap font-mono text-[11px] tabular-nums text-muted-foreground sm:text-xs"
                        title={reading.phoneNumber}
                      >
                        {reading.phoneNumber.replace(/\s+/g, '\u00A0')}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-0 px-2 py-2 align-middle">
                      <div className="flex min-w-0 items-start gap-1.5">
                        <MapPin
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                        <span
                          className="min-w-0 truncate text-xs leading-tight text-muted-foreground sm:text-sm"
                          title={`${reading.stationName ? `${reading.stationName} · ` : ''}${reading.location}`}
                        >
                          {reading.location}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-2 py-2 align-middle text-left tabular-nums text-sm font-semibold">
                      {reading.levelM.toFixed(2)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-2 py-2 align-middle text-xs tabular-nums text-muted-foreground sm:text-sm">
                      {formatTime(reading.measuredAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-2 py-2 align-middle text-xs tabular-nums text-muted-foreground sm:text-sm">
                      {formatDate(reading.measuredAt)}
                    </TableCell>
                    <TableCell className="max-w-0 px-2 py-2 align-middle" title={reading.gpsLocation}>
                      <span className="block truncate font-mono text-[11px] tabular-nums leading-tight text-muted-foreground sm:text-xs">
                        {reading.gpsLocation || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-0 px-1 py-1.5 align-middle">
                      <Select
                        value={selectValue}
                        onValueChange={(value) =>
                          void onValidate(reading, value as 'valid' | 'reject')
                        }
                        disabled={
                          reading.gaugeOfficerId === 'nwrma-api' ||
                          savingId === reading.id
                        }
                      >
                        <SelectTrigger
                          size="sm"
                          className={cn(
                            'mx-auto h-8 w-full min-w-[6.5rem] max-w-[100%] justify-between px-2 text-xs shadow-none',
                            reading.hodValidation === 'valid' &&
                              'border-secondary text-secondary [&_svg]:text-secondary',
                            reading.hodValidation === 'rejected' &&
                              'border-destructive text-destructive [&_svg]:text-destructive'
                          )}
                          aria-label={`Review reading ${reading.id}`}
                        >
                          <SelectValue placeholder="Choose…" />
                        </SelectTrigger>
                        <SelectContent align="end" position="popper">
                          <SelectItem
                            value="valid"
                            className="cursor-pointer text-secondary focus:bg-secondary/15 focus:text-secondary [&_svg]:text-secondary!"
                          >
                            <span className="flex items-center gap-2">
                              <CircleCheck className="size-4 shrink-0" aria-hidden />
                              Valid
                            </span>
                          </SelectItem>
                          <SelectItem
                            value="reject"
                            className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive [&_svg]:text-destructive!"
                          >
                            <span className="flex items-center gap-2">
                              <CircleX className="size-4 shrink-0" aria-hidden />
                              Reject
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
