'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarRange, FileSpreadsheet, FileText, Loader2, RefreshCw } from 'lucide-react'
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
import { useAppBranding } from '@/components/app-branding-provider'
import { useSessionUser } from '@/components/demo-session-provider'
import { resolvedApiUrl } from '@/lib/apiBase'
import { formatDateValue, formatNLe } from '@/lib/erp-formatting'
import {
  BOREHOLES_REPORT_SECTION_KEYS,
  type BoreholesActivityReportResponse,
  type BoreholesReportSectionKey,
} from '@/lib/boreholes-activity-report.types'
function defaultReportRange(): { from: string; to: string } {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}

const SECTION_OPTIONS: {
  key: BoreholesReportSectionKey
  label: string
  description: string
}[] = [
  {
    key: 'licences',
    label: 'Drilling licences',
    description: 'Portal applications submitted or reviewed in the period.',
  },
  {
    key: 'companies',
    label: 'Drilling companies',
    description: 'Full company register snapshot.',
  },
  {
    key: 'registry',
    label: 'Borehole registry',
    description: 'Pending Survey123 queue and newly registered boreholes in the period.',
  },
  {
    key: 'survey123',
    label: 'Survey123 intakes',
    description: 'Field intakes received in the period.',
  },
  {
    key: 'budget',
    label: 'Programme budget',
    description: 'Current boreholes department budget lines (FY snapshot).',
  },
]

export function BoreholesDepartmentReports() {
  const { actingUserHeaders } = useSessionUser()
  const { branding } = useAppBranding()
  const initialRange = useMemo(() => defaultReportRange(), [])
  const [dateFrom, setDateFrom] = useState(initialRange.from)
  const [dateTo, setDateTo] = useState(initialRange.to)
  const [selected, setSelected] = useState<Set<BoreholesReportSectionKey>>(
    () => new Set(BOREHOLES_REPORT_SECTION_KEYS)
  )

  const [report, setReport] = useState<BoreholesActivityReportResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [xlsxBusy, setXlsxBusy] = useState(false)
  const [error, setError] = useState<{ status?: number; message: string } | null>(null)

  const sectionsParam = useMemo(
    () => BOREHOLES_REPORT_SECTION_KEYS.filter((k) => selected.has(k)).join(','),
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
      const res = await fetch(resolvedApiUrl(`/api/boreholes/activity-report?${q}`), {
        headers: { ...actingUserHeaders },
        credentials: 'same-origin',
        cache: 'no-store',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setReport(null)
        setError({
          status: res.status,
          message:
            typeof data.error === 'string' ? data.error : 'Could not load boreholes activity report.',
        })
        return
      }
      setReport(data as BoreholesActivityReportResponse)
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

  const toggleSection = (key: BoreholesReportSectionKey, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }

  const safePeriodSlug = () =>
    (report?.meta.periodLabel ?? 'report').replace(/[^\dA-Za-z-]+/g, '_')

  const onExportPdf = async () => {
    if (!report) return
    setPdfBusy(true)
    try {
      const [{ downloadBoreholesActivityReportPdf }, { resolveReportLogoForPdf }] =
        await Promise.all([
          import('@/lib/boreholes-activity-report-pdf'),
          import('@/lib/hydro-activity-report-pdf-logo'),
        ])
      const logo = await resolveReportLogoForPdf(branding)
      downloadBoreholesActivityReportPdf(
        report,
        `boreholes_activity_report_${safePeriodSlug()}.pdf`,
        { logo: logo ?? undefined }
      )
    } finally {
      setPdfBusy(false)
    }
  }

  const onExportXlsx = async () => {
    if (!report) return
    setXlsxBusy(true)
    try {
      const { downloadBoreholesActivityReportXlsx } = await import(
        '@/lib/boreholes-activity-report-xlsx'
      )
      downloadBoreholesActivityReportXlsx(
        report,
        `boreholes_activity_report_${safePeriodSlug()}.xlsx`
      )
    } finally {
      setXlsxBusy(false)
    }
  }

  const es = report?.executiveSummary

  const kpiCards = es
    ? [
        {
          title: 'Licence applications',
          value: es.licenceApplicationsInPeriod,
          hint: `${es.licencesApproved} approved · ${es.licencesRejected} rejected`,
        },
        {
          title: 'Registry queue',
          value: es.registryPendingQueue,
          hint: `${es.registryIntakesReceivedInPeriod} intakes received in period`,
        },
        {
          title: 'Registered boreholes',
          value: es.registeredBoreholesInPeriod,
          hint: `${es.registeredBoreholesTotal} total approved`,
        },
        {
          title: 'Survey123 intakes',
          value: es.survey123IntakesInPeriod,
          hint: `${es.survey123RegisteredInPeriod} registered · ${es.survey123RejectedInPeriod} rejected`,
        },
        {
          title: 'Drilling companies',
          value: es.drillingCompaniesTotal,
          hint: `${es.drillingCompaniesActive} active`,
        },
        {
          title: 'Budget utilization',
          value:
            es.budgetUtilizationPct != null ? `${es.budgetUtilizationPct}%` : '—',
          hint: `${formatNLe(es.budgetUtilizedSle)} of ${formatNLe(es.budgetAllocatedSle)}`,
        },
      ]
    : []

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          {report?.meta.organisation ??
            'National Water Resources Management Agency — Sierra Leone'}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">
          Boreholes department reports
        </h1>
      </div>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarRange className="h-5 w-5" aria-hidden />
            Report parameters
          </CardTitle>
          <CardDescription>Select the reporting period and sections to include</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <Label htmlFor="bh-report-from">From</Label>
              <Input
                id="bh-report-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[11rem] font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bh-report-to">To</Label>
              <Input
                id="bh-report-to"
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
                    id={`bh-sec-${opt.key}`}
                    checked={selected.has(opt.key)}
                    onCheckedChange={(v) => toggleSection(opt.key, v === true)}
                    aria-describedby={`bh-sec-${opt.key}-desc`}
                  />
                  <div className="min-w-0 space-y-0.5">
                    <Label htmlFor={`bh-sec-${opt.key}`} className="cursor-pointer font-medium">
                      {opt.label}
                    </Label>
                    <p id={`bh-sec-${opt.key}-desc`} className="text-xs text-muted-foreground">
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
              onClick={() => void onExportXlsx()}
              disabled={!report || loading || xlsxBusy}
            >
              {xlsxBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              Download Excel
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

      {error ? (
        <div
          className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
          role="alert"
        >
          {error.status === 403 ? (
            <p>
              <strong>Access denied.</strong> This report is limited to boreholes departmental users
              (and director general / administrator roles).
            </p>
          ) : error.status === 401 ? (
            <p>
              <strong>Sign-in required.</strong> Sign in again to load the report.
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
        <>
          <div>
            <p className="text-sm text-muted-foreground">
              {report.meta.department} · {report.meta.periodLabel}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kpiCards.map((card) => (
              <Card key={card.title} className="border-border">
                <CardHeader className="pb-2">
                  <CardDescription>{card.title}</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">{card.value}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{card.hint}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {report.activities.map((block) => (
            <Card key={`${block.section}-${block.title}`} className="border-border">
              <CardHeader>
                <CardTitle className="text-lg">{block.title}</CardTitle>
                {block.narrative ? (
                  <CardDescription>{block.narrative}</CardDescription>
                ) : null}
              </CardHeader>
              <CardContent>
                {block.rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No rows for this section.</p>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {block.columns.map((col) => (
                            <TableHead key={col.key}>{col.label}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {block.rows.map((row, ri) => (
                          <TableRow key={ri}>
                            {block.columns.map((col) => {
                              const raw = row[col.key]
                              const display =
                                raw == null
                                  ? '—'
                                  : typeof raw === 'string' &&
                                      /^\d{4}-\d{2}-\d{2}T/.test(raw)
                                    ? formatDateValue(raw)
                                    : String(raw)
                              return <TableCell key={col.key}>{display}</TableCell>
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </>
      ) : null}
    </div>
  )
}