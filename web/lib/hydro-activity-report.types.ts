export const HYDRO_REPORT_SECTION_KEYS = [
  'readings',
  'floods',
  'payments',
  'budget',
  'requisitions',
] as const

export type HydroReportSectionKey = (typeof HYDRO_REPORT_SECTION_KEYS)[number]

export interface HydroActivityReportMeta {
  generatedAt: string
  periodLabel: string
  periodStart: string
  periodEnd: string
  organisation: string
  department: string
  includedSections: HydroReportSectionKey[]
}

export interface HydroExecutiveSummary {
  totalReadings: number
  validatedReadings: number
  pendingValidationReadings: number
  suspectQualityReadings: number
  monitoringStationsActive: number
  monitoringStationsTotal: number
  floodIncidentsReported: number
  floodOpenOrMonitoring: number
  officerPaymentLinesInPeriod: number
  officerIncentivesPendingSle: number
  officerIncentivesSubmittedSle: number
  officerIncentivesApprovedSle: number
  officerIncentivesDisbursedSle: number
  budgetProgrammeLines: number
  budgetAllocatedSle: number
  budgetUtilizedSle: number
  budgetUtilizationPct: number | null
  hydroRequisitionsCount: number
  hydroRequisitionsAmountSle: number
}

export interface HydroActivityBlock {
  section: HydroReportSectionKey
  title: string
  narrative?: string
  columns: { key: string; label: string }[]
  rows: Record<string, string | number | null>[]
}

export interface HydroActivityReportResponse {
  meta: HydroActivityReportMeta
  executiveSummary: HydroExecutiveSummary
  activities: HydroActivityBlock[]
  rollups: {
    readingsByStation?: { stationName: string; count: number; validated: number }[]
    paymentsByStatus?: { status: string; count: number; amountSle: number }[]
  }
  waterMonitoring: {
    stationsTotal: number
    stationsActive: number
    readingsInPeriod: number
    suspectReadingsInPeriod: number
  } | null
  /** Leadership PDF (HYDROLOGICAL GENERAL REPORT) — same structure as the departmental PDF export. */
  pdfLayout: HydroActivityReportPdfLayout
}

/** Structured hydrological leadership PDF — aligned with the HYDROLOGICAL GENERAL REPORT template. */
export interface HydroActivityReportPdfLayout {
  title: string
  subtitle: string
  periodLine: string
  generatedLine: string
  intro: string
  keyIndicators: [string, string][]
  readingComposition: { indicator: string; count: number; share: string }[]
  riskBands: { band: string; sites: number; mix: string }[]
  latestReadings: {
    riverSite: string
    region: string
    level: string
    pctThreshold: string
    risk: string
    trend: string
    reads: number
  }[]
  paymentsPipeline: { stage: string; count: number; mix: string; amount: string }[]
  requisitionsByStatus: { status: string; count: number; mix: string }[]
  requisitionsExpense: { kind: string; count: number; mix: string }[]
  budgetFiscalRollup: { fy: string; allocated: string; utilized: string; balance: string; utilPct: string }[]
  programmeLines: { programme: string; fy: string; allocated: string; utilized: string; balance: string; utilPct: string }[]
  footerTagline: string
}

export function parseHydroReportSectionsParam(
  param: string | null
): HydroReportSectionKey[] {
  const ALL: HydroReportSectionKey[] = [...HYDRO_REPORT_SECTION_KEYS]
  if (!param?.trim()) return ALL
  const allowed = new Set<string>(HYDRO_REPORT_SECTION_KEYS)
  const parts = param.split(',').map((s) => s.trim()).filter(Boolean)
  const out = parts.filter((p): p is HydroReportSectionKey => allowed.has(p))
  return out.length ? out : ALL
}
