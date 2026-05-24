'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarRange,
  FileDown,
  FileText,
  Info,
  Loader2,
  OctagonAlert,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatCard } from '@/components/hydro/stat-card'
import { useAppBranding } from '@/components/app-branding-provider'
import { useSessionUser } from '@/components/demo-session-provider'
import { formatDate, formatNLe } from '@/lib/mock-data'
import {
  HYDRO_REPORT_SECTION_KEYS,
  type HydroActivityReportResponse,
  type HydroReportSectionKey,
} from '@/lib/hydro-activity-report.types'
import { activityReportToCsv, downloadCsv } from '@/lib/hydro-activity-report-csv'
import { cn } from '@/lib/utils'

/** Section checklist — keys must stay aligned with `HYDRO_REPORT_SECTION_KEYS` / API */
export const SECTION_OPTIONS: {
  key: HydroReportSectionKey
  label: string
  description: string
}[] = [
  {
    key: 'readings',
    label: 'Water level readings',
    description: 'Measurements, quality flags, and HoD validation affecting officer incentives.',
  },
  {
    key: 'floods',
    label: 'Floods & high-water',
    description: 'Departmental flood / surge register and field situational reports.',
  },
  {
    key: 'payments',
    label: 'Officer incentive payments',
    description: 'Monthly payroll rows overlapping the period (pending through disbursed).',
  },
  {
    key: 'budget',
    label: 'Programme budget',
    description: 'Hydrological programme lines (FY snapshot, not prorated to the window).',
  },
  {
    key: 'requisitions',
    label: 'Departmental requisitions',
    description: 'Hydrological requisitions created within the selected dates.',
  },
]

function FloodSeverityPresent({ severity }: { severity: string }) {
  const cfg =
    severity === 'severe'
      ? {
          Icon: OctagonAlert,
          text: 'Severe — immediate escalation',
          className: 'border-destructive text-foreground',
        }
      : severity === 'warning'
        ? {
            Icon: AlertTriangle,
            text: 'Warning — heightened monitoring',
            className: 'border-amber-600 text-foreground',
          }
        : {
            Icon: Info,
            text: 'Watch — routine monitoring',
            className: 'border-blue-600 text-foreground',
          }
  return (
    <span
      className={cn(
        'inline-flex max-w-[18rem] items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium',
        cfg.className
      )}
    >
      <cfg.Icon className="size-3.5 shrink-0" aria-hidden />
      <span>{cfg.text}</span>
    </span>
  )
}

export function HydrologicalBudgetReports() {
  const { actingUserHeaders } = useSessionUser()
  const { branding } = useAppBranding()
  const [dateFrom, setDateFrom] = useState('2024-03-01')
  const [dateTo, setDateTo] = useState('2024-03-31')
  const [selected, setSelected] = useState<Set<HydroReportSectionKey>>(
    () => new Set(HYDRO_REPORT_SECTION_KEYS)
  )

  const [report, setReport] = useState<HydroActivityReportResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [error, setError] = useState<{ status?: number; message: string } | null>(null)

  const sectionsParam = useMemo(
    () => HYDRO_REPORT_SECTION_KEYS.filter((k) => selected.has(k)).join(','),
    [selected]
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const q = new URLSearchParams({
        from: dateFrom,
        to: dateTo,
        sections: sectionsParam,
      })
      const res = await fetch(`/api/hydrological/activity-report?${q}`, {
        headers: { ...actingUserHeaders },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setReport(null)
        setError({
          status: res.status,
          message: data.error ?? 'Could not load activity report.',
        })
        return
      }
      setReport(data as HydroActivityReportResponse)
    } catch {
      setReport(null)
      setError({ message: 'Network error while loading the report.' })
    } finally {
      setLoading(false)
    }
  }, [actingUserHeaders, dateFrom, dateTo, sectionsParam])

  useEffect(() => {
    if (!sectionsParam) {
      setError({ message: 'Select at least one section.' })
      setReport(null)
      return
    }
    void load()
  }, [load, sectionsParam])

  const toggleSection = (key: HydroReportSectionKey, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }

  const onExportCsv = () => {
    if (!report) return
    const safe = report.meta.periodLabel.replace(/[^\dA-Za-z-]+/g, '_')
    downloadCsv(`hydrological_activity_report_${safe}.csv`, activityReportToCsv(report))
  }

  const onExportPdf = async () => {
    if (!report) return
    setPdfBusy(true)
    try {
      const [{ downloadActivityReportPdf }, { resolveReportLogoForPdf }] = await Promise.all([
        import('@/lib/hydro-activity-report-pdf'),
        import('@/lib/hydro-activity-report-pdf-logo'),
      ])
      const logo = await resolveReportLogoForPdf(branding)
      const safe = report.meta.periodLabel.replace(/[^\dA-Za-z-]+/g, '_')
      downloadActivityReportPdf(report, `hydrological_activity_report_${safe}.pdf`, {
        logo: logo ?? undefined,
      })
    } finally {
      setPdfBusy(false)
    }
  }

  const es = report?.executiveSummary

  const kpiCards = es
    ? [
        {
          title: 'Readings recorded',
          value: es.totalReadings,
          hint: `${es.validatedReadings} validated · ${es.pendingValidationReadings} pending review`,
        },
        {
          title: 'Quality / validation risk',
          value: es.suspectQualityReadings,
          hint: 'Suspect or poor quality (review alongside validation queue)',
        },
        {
          title: 'Monitoring stations',
          value: `${es.monitoringStationsActive} / ${es.monitoringStationsTotal}`,
          hint: 'Active vs total gauge network',
        },
        {
          title: 'Flood incidents',
          value: es.floodIncidentsReported,
          hint: `${es.floodOpenOrMonitoring} open or monitoring`,
        },
        {
          title: 'Incentive payment lines',
          value: es.officerPaymentLinesInPeriod,
          hint: 'Overlapping the report window',
        },
        {
          title: 'Incentives pending (SLE)',
          value: formatNLe(es.officerIncentivesPendingSle),
          hint: 'Not yet submitted to DG',
        },
        {
          title: 'Incentives with DG (SLE)',
          value: formatNLe(es.officerIncentivesSubmittedSle),
          hint: 'Submitted for approval',
        },
        {
          title: 'Incentives approved / paid (SLE)',
          value: `${formatNLe(es.officerIncentivesApprovedSle)} / ${formatNLe(es.officerIncentivesDisbursedSle)}`,
          hint: 'Approved total · Disbursed total',
        },
        {
          title: 'Budget lines',
          value: es.budgetProgrammeLines,
          hint:
            es.budgetUtilizationPct != null
              ? `${formatNLe(es.budgetUtilizedSle)} of ${formatNLe(es.budgetAllocatedSle)} (${es.budgetUtilizationPct}% utilised)`
              : formatNLe(es.budgetAllocatedSle),
        },
        {
          title: 'Hydrological requisitions',
          value: es.hydroRequisitionsCount,
          hint: formatNLe(es.hydroRequisitionsAmountSle),
        },
      ]
    : []

  return (
    <div className="space-y-6">
      <div className={cn('hydro-report-no-print space-y-4')}>
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {report?.meta.organisation ?? 'National Water Resources Management Agency — Sierra Leone'}
          </p>
        </div>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarRange className="h-5 w-5" aria-hidden />
              Report parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <Label htmlFor="report-from">From</Label>
                <Input
                  id="report-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-[11rem] font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="report-to">To</Label>
                <Input
                  id="report-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-[11rem] font-mono"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => void load()}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Refresh
                </Button>
              </div>
            </div>

            <fieldset className="space-y-3 rounded-lg border border-border p-4">
              <legend className="px-1 text-sm font-semibold">Sections to include</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {SECTION_OPTIONS.map((opt) => (
                  <div
                    key={opt.key}
                    className="flex gap-3 rounded-md border border-transparent hover:border-border/80"
                  >
                    <Checkbox
                      id={`sec-${opt.key}`}
                      checked={selected.has(opt.key)}
                      onCheckedChange={(v) => toggleSection(opt.key, v === true)}
                      aria-describedby={`sec-${opt.key}-desc`}
                    />
                    <div className="min-w-0 space-y-0.5">
                      <Label htmlFor={`sec-${opt.key}`} className="cursor-pointer font-medium">
                        {opt.label}
                      </Label>
                      <p id={`sec-${opt.key}-desc`} className="text-xs text-muted-foreground">
                        {opt.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={onExportCsv}
                disabled={!report || loading}
              >
                <FileDown className="h-4 w-4" />
                Download CSV (Excel)
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => void onExportPdf()}
                disabled={!report || loading || pdfBusy}
              >
                {pdfBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {error ? (
        <div
          className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
          role="alert"
        >
          {error.status === 403 ? (
            <p>
              <strong>Access denied.</strong> This report is limited to hydrological departmental
              users (and director general / administrator roles). Try a hydro user id via{' '}
              <span className="font-mono">X-Acting-User-Id</span> in API tests.
            </p>
          ) : error.status === 401 ? (
            <p>
              <strong>Sign-in required.</strong> The demo UI sends your current user id; API clients
              must send <span className="font-mono">X-Acting-User-Id</span>.
            </p>
          ) : (
            <p>{error.message}</p>
          )}
        </div>
      ) : null}

      {loading && !report ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Generating report…
        </div>
      ) : null}

      {report ? (
        <div id="hydro-dept-report" className="hydro-report-print-root space-y-6">
          <div>
            <h2 className="mb-3 text-lg font-semibold">Executive summary</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {kpiCards.map((k) => (
                <StatCard
                  key={k.title}
                  title={k.title}
                  value={k.value}
                  hint={k.hint}
                  className="border-border"
                />
              ))}
            </div>
          </div>

          {report.waterMonitoring ? (
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Water monitoring rollup</CardTitle>
                <CardDescription>
                  Network and reading volume context for the period (not a substitute for the
                  detailed readings table).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Stations (active / total)</TableCell>
                      <TableCell className="tabular-nums">
                        {report.waterMonitoring.stationsActive} /{' '}
                        {report.waterMonitoring.stationsTotal}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Readings in period</TableCell>
                      <TableCell className="tabular-nums">
                        {report.waterMonitoring.readingsInPeriod}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Suspect / poor readings</TableCell>
                      <TableCell className="tabular-nums">
                        {report.waterMonitoring.suspectReadingsInPeriod}
                        <span className="ml-2 text-xs text-muted-foreground">
                          (paired with validation and field QA)
                        </span>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}

          {report.rollups.readingsByStation?.length ? (
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Rollup — readings by station</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Station</TableHead>
                      <TableHead className="text-right">Readings</TableHead>
                      <TableHead className="text-right">Validated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.rollups.readingsByStation.map((r) => (
                      <TableRow key={r.stationName}>
                        <TableCell>{r.stationName}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.validated}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}

          {report.rollups.paymentsByStatus?.length ? (
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Rollup — incentive payments by status</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Lines</TableHead>
                      <TableHead className="text-right">Amount (SLE)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.rollups.paymentsByStatus.map((r) => (
                      <TableRow key={r.status}>
                        <TableCell className="capitalize">{r.status}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNLe(r.amountSle)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}

          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Section detail</h2>
            {report.activities.map((block) => (
              <Card key={block.section} className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{block.title}</CardTitle>
                  {block.narrative ? (
                    <CardDescription className="text-pretty">{block.narrative}</CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent className="overflow-x-auto px-0 sm:px-6">
                  {block.rows.length === 0 ? (
                    <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                      No rows in this period for this section.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {block.columns.map((c) => (
                            <TableHead key={c.key}>{c.label}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {block.rows.map((row, idx) => (
                          <TableRow key={`${block.section}-${idx}`}>
                            {block.columns.map((c) => (
                              <TableCell key={c.key} className="max-w-[20rem] whitespace-normal">
                                {block.section === 'floods' && c.key === 'severity' ? (
                                  <FloodSeverityPresent severity={String(row[c.key])} />
                                ) : c.key === 'date' ||
                                  c.key === 'reportedAt' ||
                                  c.key === 'created' ? (
                                  formatDate(new Date(String(row[c.key])))
                                ) : c.key === 'rate' || c.key === 'total' || c.key === 'amount' ? (
                                  typeof row[c.key] === 'number' ? (
                                    formatNLe(row[c.key] as number)
                                  ) : (
                                    row[c.key]
                                  )
                                ) : c.key === 'allocated' ||
                                  c.key === 'utilized' ||
                                  c.key === 'remaining' ? (
                                  typeof row[c.key] === 'number' ? (
                                    formatNLe(row[c.key] as number)
                                  ) : (
                                    row[c.key]
                                  )
                                ) : (
                                  row[c.key]
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : !loading && !error ? (
        <p className="text-sm text-muted-foreground">Select parameters to generate a report.</p>
      ) : null}
    </div>
  )
}

export { HYDRO_REPORT_SECTION_KEYS } from '@/lib/hydro-activity-report.types'
