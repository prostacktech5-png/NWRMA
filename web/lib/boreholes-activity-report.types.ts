export const BOREHOLES_REPORT_SECTION_KEYS = [
  'licences',
  'companies',
  'registry',
  'survey123',
  'budget',
] as const

export type BoreholesReportSectionKey = (typeof BOREHOLES_REPORT_SECTION_KEYS)[number]

export interface BoreholesActivityReportMeta {
  generatedAt: string
  periodLabel: string
  periodStart: string
  periodEnd: string
  organisation: string
  department: string
  includedSections: BoreholesReportSectionKey[]
}

export interface BoreholesExecutiveSummary {
  licenceApplicationsInPeriod: number
  licencesSubmitted: number
  licencesUnderReview: number
  licencesApproved: number
  licencesRejected: number
  licencesAdditionalInfo: number
  drillingCompaniesTotal: number
  drillingCompaniesActive: number
  registryPendingQueue: number
  registryIntakesReceivedInPeriod: number
  registeredBoreholesInPeriod: number
  registeredBoreholesTotal: number
  survey123IntakesInPeriod: number
  survey123RegisteredInPeriod: number
  survey123RejectedInPeriod: number
  budgetLines: number
  budgetAllocatedSle: number
  budgetUtilizedSle: number
  budgetAvailableSle: number
  budgetUtilizationPct: number | null
}

export interface BoreholesActivityBlock {
  section: BoreholesReportSectionKey
  title: string
  narrative?: string
  columns: { key: string; label: string }[]
  rows: Record<string, string | number | null>[]
}

export interface BoreholesActivityReportPdfLayout {
  title: string
  subtitle: string
  periodLine: string
  generatedLine: string
  intro: string
  keyIndicators: [string, string][]
  sectionTables: { title: string; head: string[]; body: string[][] }[]
  footerTagline: string
}

export interface BoreholesActivityReportResponse {
  meta: BoreholesActivityReportMeta
  executiveSummary: BoreholesExecutiveSummary
  activities: BoreholesActivityBlock[]
  rollups: {
    licencesByStatus?: { status: string; count: number }[]
    survey123ByStatus?: { status: string; count: number }[]
  }
  pdfLayout: BoreholesActivityReportPdfLayout
}

export function parseBoreholesReportSectionsParam(
  param: string | null
): BoreholesReportSectionKey[] {
  const ALL: BoreholesReportSectionKey[] = [...BOREHOLES_REPORT_SECTION_KEYS]
  if (!param?.trim()) return ALL
  const allowed = new Set<string>(BOREHOLES_REPORT_SECTION_KEYS)
  const parts = param.split(',').map((s) => s.trim()).filter(Boolean)
  const out = parts.filter((p): p is BoreholesReportSectionKey => allowed.has(p))
  return out.length ? out : ALL
}
