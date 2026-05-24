import type { User } from '@/lib/types'
import { departmentNames, requisitionStatusLabels } from '@/lib/mock-data'
import { loadOrSeedErpReferencePayload } from '@/lib/db/reference-data-persistence'
import { getHydroPaymentStore } from '@/lib/hydro-payment-store'
import type {
  HydroActivityBlock,
  HydroActivityReportMeta,
  HydroActivityReportResponse,
  HydroExecutiveSummary,
  HydroReportSectionKey,
} from '@/lib/hydro-activity-report.types'
import { buildHydroActivityPdfLayout } from '@/lib/hydro-activity-report-pdf-layout'

export function canViewHydroActivityReport(user: User): boolean {
  if (user.role === 'dg') return true
  return user.department === 'hydrological'
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

function inPeriod(iso: Date, periodStart: Date, periodEnd: Date): boolean {
  const t = iso.getTime()
  return t >= startOfDay(periodStart).getTime() && t <= endOfDay(periodEnd).getTime()
}

function paymentOverlapsPeriod(
  yearMonth: string,
  periodStart: Date,
  periodEnd: Date
): boolean {
  const [y, m] = yearMonth.split('-').map(Number)
  const monthStart = new Date(y, m - 1, 1)
  const monthEnd = new Date(y, m, 0, 23, 59, 59, 999)
  return (
    monthEnd.getTime() >= startOfDay(periodStart).getTime() &&
    monthStart.getTime() <= endOfDay(periodEnd).getTime()
  )
}

function periodLabelEn(start: Date, end: Date): string {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return `${fmt.format(start)} – ${fmt.format(end)}`
}

export async function buildHydroActivityReport(input: {
  periodStart: Date
  periodEnd: Date
  sections: HydroReportSectionKey[]
}): Promise<HydroActivityReportResponse> {
  const { periodStart, periodEnd } = input
  const includedSections = [...new Set(input.sections)]
  const ref = await loadOrSeedErpReferencePayload()
  const floodIncidents = ref.floodIncidents
  const requisitions = ref.requisitions
  const budgetLines = ref.programmeBudgetLines
  const monitoringStations = ref.monitoringStations
  const store = await getHydroPaymentStore()

  const readings = store.readings.filter((r) =>
    inPeriod(new Date(r.measuredAt), periodStart, periodEnd)
  )

  const floods = floodIncidents.filter((f) =>
    inPeriod(new Date(f.reportedAt), periodStart, periodEnd)
  )

  const paymentsInPeriod = store.payments.filter((p) =>
    paymentOverlapsPeriod(p.yearMonth, periodStart, periodEnd)
  )

  const hydroReqs = requisitions.filter(
    (r) =>
      r.department === 'hydrological' &&
      inPeriod(new Date(r.createdAt), periodStart, periodEnd)
  )

  const hydroBudget = budgetLines.filter((l) => l.department === 'hydrological')

  const totalAlloc = hydroBudget.reduce((s, l) => s + l.allocatedAmount, 0)
  const totalUti = hydroBudget.reduce((s, l) => s + l.utilizedAmount, 0)
  const utilPct =
    totalAlloc > 0 ? Math.round((totalUti / totalAlloc) * 1000) / 10 : null

  const exec: HydroExecutiveSummary = {
    totalReadings: readings.length,
    validatedReadings: readings.filter((r) => r.hodValidation === 'valid').length,
    pendingValidationReadings: readings.filter((r) => r.hodValidation === 'pending')
      .length,
    suspectQualityReadings: readings.filter(
      (r) => r.qualityFlag === 'suspect' || r.qualityFlag === 'poor'
    ).length,
    monitoringStationsActive: monitoringStations.filter((s) => s.status === 'active')
      .length,
    monitoringStationsTotal: monitoringStations.length,
    floodIncidentsReported: floods.length,
    floodOpenOrMonitoring: floods.filter((f) => f.status !== 'closed').length,
    officerPaymentLinesInPeriod: paymentsInPeriod.length,
    officerIncentivesPendingSle: paymentsInPeriod
      .filter((p) => p.status === 'pending')
      .reduce((s, p) => s + p.totalSle, 0),
    officerIncentivesSubmittedSle: paymentsInPeriod
      .filter((p) => p.status === 'submitted')
      .reduce((s, p) => s + p.totalSle, 0),
    officerIncentivesApprovedSle: paymentsInPeriod
      .filter((p) => p.status === 'approved')
      .reduce((s, p) => s + p.totalSle, 0),
    officerIncentivesDisbursedSle: paymentsInPeriod
      .filter((p) => p.status === 'disbursed')
      .reduce((s, p) => s + p.totalSle, 0),
    budgetProgrammeLines: hydroBudget.length,
    budgetAllocatedSle: totalAlloc,
    budgetUtilizedSle: totalUti,
    budgetUtilizationPct: utilPct,
    hydroRequisitionsCount: hydroReqs.length,
    hydroRequisitionsAmountSle: hydroReqs.reduce((s, r) => s + r.amount, 0),
  }

  /** Stations with at least one reading in period */
  const stationIds = new Set(readings.map((r) => r.stationId))
  const readingsByStation = [...stationIds].map((sid) => {
    const stationName =
      readings.find((r) => r.stationId === sid)?.stationName ?? sid
    const subset = readings.filter((r) => r.stationId === sid)
    return {
      stationName,
      count: subset.length,
      validated: subset.filter((r) => r.hodValidation === 'valid').length,
    }
  })

  const paymentsByStatus: { status: string; count: number; amountSle: number }[] = []
  for (const st of ['pending', 'submitted', 'approved', 'disbursed'] as const) {
    const slice = paymentsInPeriod.filter((p) => p.status === st)
    if (slice.length)
      paymentsByStatus.push({
        status: st,
        count: slice.length,
        amountSle: slice.reduce((s, p) => s + p.totalSle, 0),
      })
  }

  const activities: HydroActivityBlock[] = []

  if (includedSections.includes('readings')) {
    activities.push({
      section: 'readings',
      title: 'Water level readings',
      narrative:
        'Field readings captured in the period. Validation status reflects HoD review for incentive accrual.',
      columns: [
        { key: 'date', label: 'Measured' },
        { key: 'station', label: 'Station' },
        { key: 'officer', label: 'Officer' },
        { key: 'levelM', label: 'Level (m)' },
        { key: 'quality', label: 'Quality' },
        { key: 'validation', label: 'HoD validation' },
      ],
      rows: readings
        .slice()
        .sort(
          (a, b) =>
            new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime()
        )
        .map((r) => ({
          date: new Date(r.measuredAt).toISOString(),
          station: r.stationName,
          officer: r.officerName,
          levelM: r.levelM,
          quality: r.qualityFlag ?? '—',
          validation: r.hodValidation,
        })),
    })
  }

  if (includedSections.includes('floods')) {
    activities.push({
      section: 'floods',
      title: 'Flood & high-water incidents',
      narrative:
        'Departmental register of reported events. Severity labels are duplicated in exports for accessibility (not colour-only).',
      columns: [
        { key: 'reportedAt', label: 'Reported' },
        { key: 'district', label: 'District' },
        { key: 'area', label: 'River / area' },
        { key: 'severity', label: 'Severity' },
        { key: 'status', label: 'Status' },
        { key: 'summary', label: 'Summary' },
      ],
      rows: floods
        .slice()
        .sort(
          (a, b) =>
            new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()
        )
        .map((f) => ({
          reportedAt: new Date(f.reportedAt).toISOString(),
          district: f.district,
          area: f.riverOrArea,
          severity: f.severity,
          status: f.status,
          summary: f.summary,
        })),
    })
  }

  if (includedSections.includes('payments')) {
    activities.push({
      section: 'payments',
      title: 'Officer incentive payments',
      narrative:
        'Monthly incentive rows overlapping the report window (validated readings × configured rate, subject to workflow state).',
      columns: [
        { key: 'officer', label: 'Officer' },
        { key: 'month', label: 'Month' },
        { key: 'readings', label: 'Valid readings' },
        { key: 'rate', label: 'Rate (SLE)' },
        { key: 'total', label: 'Total (SLE)' },
        { key: 'status', label: 'Status' },
      ],
      rows: paymentsInPeriod.map((p) => ({
        officer: p.officerName,
        month: p.yearMonth,
        readings: p.validSubmissions,
        rate: p.rateSle,
        total: p.totalSle,
        status: p.status,
      })),
    })
  }

  if (includedSections.includes('budget')) {
    activities.push({
      section: 'budget',
      title: 'Hydrological programme budget (active FY snapshot)',
      narrative:
        'Allocated and utilized amounts for hydrological programme lines. Programme budgets are annual; figures are not prorated to the report window.',
      columns: [
        { key: 'code', label: 'Code' },
        { key: 'programme', label: 'Programme' },
        { key: 'allocated', label: 'Allocated (SLE)' },
        { key: 'utilized', label: 'Utilized (SLE)' },
        { key: 'remaining', label: 'Remaining (SLE)' },
      ],
      rows: hydroBudget.map((l) => ({
        code: l.programmeCode,
        programme: l.programmeName,
        allocated: l.allocatedAmount,
        utilized: l.utilizedAmount,
        remaining: l.allocatedAmount - l.utilizedAmount,
      })),
    })
  }

  if (includedSections.includes('requisitions')) {
    activities.push({
      section: 'requisitions',
      title: 'Hydrological requisitions',
      narrative:
        'Departmental requisitions created within the period (all workflow states).',
      columns: [
        { key: 'created', label: 'Created' },
        { key: 'requester', label: 'Requester' },
        { key: 'amount', label: 'Amount (SLE)' },
        { key: 'status', label: 'Status' },
        { key: 'narrative', label: 'Narrative' },
      ],
      rows: hydroReqs
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .map((r) => ({
          created: new Date(r.createdAt).toISOString(),
          requester: r.requesterName,
          amount: r.amount,
          status: requisitionStatusLabels[r.status] ?? r.status,
          narrative: r.narrative,
        })),
    })
  }

  const meta: HydroActivityReportMeta = {
    generatedAt: new Date().toISOString(),
    periodLabel: periodLabelEn(periodStart, periodEnd),
    periodStart: startOfDay(periodStart).toISOString(),
    periodEnd: endOfDay(periodEnd).toISOString(),
    organisation: 'National Water Resources Management Agency — Sierra Leone',
    department: departmentNames.hydrological,
    includedSections,
  }

  const rollups: HydroActivityReportResponse['rollups'] = {}
  if (includedSections.includes('readings')) {
    rollups.readingsByStation = readingsByStation
  }
  if (includedSections.includes('payments')) {
    rollups.paymentsByStatus = paymentsByStatus
  }

  const waterMonitoring =
    includedSections.includes('readings') || includedSections.includes('floods')
      ? {
          stationsTotal: monitoringStations.length,
          stationsActive: monitoringStations.filter((s) => s.status === 'active')
            .length,
          readingsInPeriod: readings.length,
          suspectReadingsInPeriod: readings.filter(
            (r) => r.qualityFlag === 'suspect' || r.qualityFlag === 'poor'
          ).length,
        }
      : null

  const pdfLayout = buildHydroActivityPdfLayout({
    meta,
    executiveSummary: exec,
    officers: store.officers,
    monitoringStations,
    allReadings: store.readings,
    readingsInPeriod: readings,
    paymentsInPeriod,
    hydroReqs,
    hydroBudget,
    periodEnd: endOfDay(periodEnd),
  })

  return {
    meta,
    executiveSummary: exec,
    activities,
    rollups,
    waterMonitoring,
    pdfLayout,
  }
}
