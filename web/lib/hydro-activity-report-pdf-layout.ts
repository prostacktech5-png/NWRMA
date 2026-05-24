import { formatDateTime } from '@/lib/erp-formatting'
import {
  buildStationMonitoringSnapshots,
  stagePercentOfThreshold,
  statusBandFromPct,
} from '@/lib/hydro-monitoring-aggregator'
import { mapApiStationsToDashboard } from '@/lib/hydro-monitoring-dashboard-mapper'
import type {
  HydroActivityReportMeta,
  HydroExecutiveSummary,
  HydroActivityReportPdfLayout,
} from '@/lib/hydro-activity-report.types'
import type {
  GaugeOfficer,
  MonitoringStation,
  OfficerPayment,
  ProgrammeBudgetLine,
  Requisition,
  WaterLevelReading,
} from '@/lib/types'
import { requisitionStatusLabels } from '@/lib/mock-data'

function formatPdfNLe(amount: number): string {
  const formatted = new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
  return `NLe ${formatted}`
}

function formatPdfNum(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function sharePct(part: number, whole: number): string {
  if (whole <= 0) return '0.0%'
  return `${((part / whole) * 100).toFixed(1)}%`
}

function fiscalYearDisplayLabel(fiscalYearId: string): string {
  const m = fiscalYearId.match(/^fy-(\d{4})$/i)
  if (m) {
    const y1 = Number(m[1])
    const y2 = y1 + 1
    return `${y1}/${String(y2).slice(-2)}`
  }
  return fiscalYearId
}

function capitalizeWords(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

const INTRO =
  'This management report provides a complete operational overview of hydrological monitoring activities, river and gauging site status, payment pipeline performance, staff requisition distribution, and budget execution for leadership-level review and strategic planning.'

export function buildHydroActivityPdfLayout(input: {
  meta: HydroActivityReportMeta
  executiveSummary: HydroExecutiveSummary
  officers: GaugeOfficer[]
  monitoringStations: MonitoringStation[]
  allReadings: WaterLevelReading[]
  readingsInPeriod: WaterLevelReading[]
  paymentsInPeriod: OfficerPayment[]
  hydroReqs: Requisition[]
  hydroBudget: ProgrammeBudgetLine[]
  periodEnd: Date
}): HydroActivityReportPdfLayout {
  const { meta, executiveSummary: exec } = input
  const readings = input.readingsInPeriod
  const totalR = readings.length || 1

  const valid = readings.filter((r) => r.hodValidation === 'valid').length
  const pending = readings.filter((r) => r.hodValidation === 'pending').length
  const flagged = readings.filter(
    (r) => r.qualityFlag === 'suspect' || r.qualityFlag === 'poor'
  ).length
  const rejected = readings.filter((r) => r.hodValidation === 'rejected').length

  const officerIdsWithSubmission = new Set(readings.map((r) => r.gaugeOfficerId))
  const activeOfficers = input.officers.filter((o) => officerIdsWithSubmission.has(o.id)).length
  const totalOfficers = input.officers.length

  const totalPaymentSle = input.paymentsInPeriod.reduce((s, p) => s + p.totalSle, 0)

  const snapshots = buildStationMonitoringSnapshots(input.monitoringStations, input.allReadings, {
    windowDays: 30,
    now: input.periodEnd,
  })

  const stationsEnriched = input.monitoringStations.map((s) => {
    const mon = snapshots.get(s.id) ?? null
    let pctOfThreshold: number | null = null
    let statusBand: 'low' | 'medium' | 'high' | null = null
    const stageForPct = mon?.operationalStageM ?? mon?.latestStageM
    if (stageForPct != null && s.alertThresholdM > 0) {
      pctOfThreshold = stagePercentOfThreshold(stageForPct, s.alertThresholdM)
      statusBand = statusBandFromPct(pctOfThreshold)
    }
    return {
      ...s,
      monitoring: mon
        ? {
            latestStageM: mon.latestStageM,
            operationalStageM: mon.operationalStageM,
            operationalSampleCount: mon.operationalSampleCount,
            rateOfChangeMPerDay: mon.rateOfChangeMPerDay,
            sparklineLevels: mon.sparklineLevels,
            readingLat: mon.readingLat,
            readingLng: mon.readingLng,
          }
        : null,
      pctOfThreshold,
      statusBand,
    }
  })

  const dash = mapApiStationsToDashboard(stationsEnriched)

  const elevatedRiskCount = dash.stations.filter(
    (s) => s.floodRisk === 'high' || s.floodRisk === 'critical'
  ).length

  const withRiskData = dash.stations.filter((s) => s.latestLevel > 0 && s.threshold > 0)
  const riskTotal = withRiskData.length || 1
  const riskOrder = ['critical', 'high', 'medium', 'low'] as const
  const riskCounts = new Map<string, number>()
  for (const s of withRiskData) {
    riskCounts.set(s.floodRisk, (riskCounts.get(s.floodRisk) ?? 0) + 1)
  }
  const riskBands = riskOrder.map((band) => ({
    band: capitalizeWords(band),
    sites: riskCounts.get(band) ?? 0,
    mix: sharePct(riskCounts.get(band) ?? 0, riskTotal),
  }))

  const riskRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  const latestReadings = dash.stations
    .filter((s) => s.latestLevel > 0 && s.threshold > 0)
    .sort((a, b) => {
      const dr = (riskRank[a.floodRisk] ?? 9) - (riskRank[b.floodRisk] ?? 9)
      if (dr !== 0) return dr
      return a.station.localeCompare(b.station)
    })
    .map((s) => {
      const pct =
        s.threshold > 0 ? Math.round((s.latestLevel / s.threshold) * 1000) / 10 : 0
      const snap = snapshots.get(s.id)
      return {
        riverSite: s.station,
        region: s.region,
        level: `${s.latestLevel}m`,
        pctThreshold: `${pct}%`,
        risk: capitalizeWords(s.floodRisk),
        trend: capitalizeWords(s.trend),
        reads: snap?.validatedCountInWindow ?? 0,
      }
    })

  const payTotalLines = input.paymentsInPeriod.length || 1
  const stages = ['pending', 'submitted', 'approved', 'disbursed'] as const
  const paymentsPipeline = stages.map((st) => {
    const slice = input.paymentsInPeriod.filter((p) => p.status === st)
    const amount = slice.reduce((s, p) => s + p.totalSle, 0)
    return {
      stage: capitalizeWords(st),
      count: slice.length,
      mix: sharePct(slice.length, payTotalLines),
      amount: formatPdfNLe(amount),
    }
  })
  paymentsPipeline.push({
    stage: 'Total',
    count: input.paymentsInPeriod.length,
    mix: '100%',
    amount: formatPdfNLe(totalPaymentSle),
  })

  const reqTotal = input.hydroReqs.length || 1
  const statusMap = new Map<string, number>()
  for (const r of input.hydroReqs) {
    const lab = requisitionStatusLabels[r.status] ?? r.status
    statusMap.set(lab, (statusMap.get(lab) ?? 0) + 1)
  }
  const requisitionsByStatus = [...statusMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => ({
      status,
      count,
      mix: sharePct(count, reqTotal),
    }))

  const requisitionsExpense = [
    {
      kind: 'General',
      count: input.hydroReqs.length,
      mix: input.hydroReqs.length ? '100.0%' : '0.0%',
    },
  ]

  const fyRoll = new Map<string, { alloc: number; uti: number }>()
  for (const l of input.hydroBudget) {
    const g = fyRoll.get(l.fiscalYearId) ?? { alloc: 0, uti: 0 }
    g.alloc += l.allocatedAmount
    g.uti += l.utilizedAmount
    fyRoll.set(l.fiscalYearId, g)
  }
  const budgetFiscalRollup = [...fyRoll.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fyId, v]) => {
      const balance = v.alloc - v.uti
      const utilPct = v.alloc > 0 ? `${((v.uti / v.alloc) * 100).toFixed(1)}%` : '0%'
      return {
        fy: fiscalYearDisplayLabel(fyId),
        allocated: formatPdfNum(v.alloc),
        utilized: formatPdfNum(v.uti),
        balance: formatPdfNum(balance),
        utilPct,
      }
    })

  const programmeLines = input.hydroBudget.map((l) => {
    const balance = l.allocatedAmount - l.utilizedAmount
    const utilPct =
      l.allocatedAmount > 0
        ? `${((l.utilizedAmount / l.allocatedAmount) * 100).toFixed(1)}%`
        : '0%'
    return {
      programme: l.programmeName,
      fy: fiscalYearDisplayLabel(l.fiscalYearId),
      allocated: formatPdfNum(l.allocatedAmount),
      utilized: formatPdfNum(l.utilizedAmount),
      balance: formatPdfNum(balance),
      utilPct,
    }
  })

  const budgetUtilLine =
    exec.budgetAllocatedSle > 0
      ? `${formatPdfNLe(exec.budgetUtilizedSle)} of ${formatPdfNLe(exec.budgetAllocatedSle)} (${exec.budgetUtilizationPct ?? 0}%)`
      : `${formatPdfNLe(exec.budgetUtilizedSle)} of ${formatPdfNLe(exec.budgetAllocatedSle)}`

  const keyIndicators: [string, string][] = [
    ['Gauge officers', `${totalOfficers} Total / ${activeOfficers} Active`],
    ['Water level readings', `${exec.totalReadings} Total readings`],
    ['Flagged readings', String(exec.suspectQualityReadings)],
    ['Elevated flood risk sites', `${elevatedRiskCount} Sites`],
    [
      'Monitoring stations',
      `${exec.monitoringStationsActive} / ${exec.monitoringStationsTotal} River/gauging sites`,
    ],
    ['Budget utilization', budgetUtilLine],
    [
      'Staff requisitions',
      `${exec.hydroRequisitionsCount} Requests · ${formatPdfNLe(exec.hydroRequisitionsAmountSle)}`,
    ],
    ['Officer payments', formatPdfNLe(totalPaymentSle)],
  ]

  return {
    title: 'HYDROLOGICAL GENERAL REPORT',
    subtitle: 'Hydrological Department Overview — Head of Department & Authorized Leadership',
    periodLine: `Reporting period: ${meta.periodLabel}`,
    generatedLine: `Generated: ${formatDateTime(new Date(meta.generatedAt))}`,
    intro: INTRO,
    keyIndicators,
    readingComposition: [
      { indicator: 'Valid', count: valid, share: sharePct(valid, totalR) },
      { indicator: 'Pending', count: pending, share: sharePct(pending, totalR) },
      { indicator: 'Flagged', count: flagged, share: sharePct(flagged, totalR) },
      { indicator: 'Rejected', count: rejected, share: sharePct(rejected, totalR) },
    ],
    riskBands,
    latestReadings,
    paymentsPipeline,
    requisitionsByStatus,
    requisitionsExpense,
    budgetFiscalRollup,
    programmeLines,
    footerTagline: 'National Water Resources Management Agency (NWRMA) · Hydrological general report',
  }
}
