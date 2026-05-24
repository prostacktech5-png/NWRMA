import { formatDateTime, formatNLe } from '@/lib/erp-formatting'
import type {
  BoreholesActivityBlock,
  BoreholesActivityReportMeta,
  BoreholesActivityReportPdfLayout,
  BoreholesExecutiveSummary,
} from '@/lib/boreholes-activity-report.types'

const INTRO =
  'This management report summarises drilling licence applications, registered drilling companies, borehole registry and Survey123 field intake activity, and programme budget execution for the Boreholes Department within the selected reporting period.'

function cell(v: unknown): string {
  if (v === null || v === undefined) return '—'
  return String(v)
}

export function buildBoreholesActivityPdfLayout(input: {
  meta: BoreholesActivityReportMeta
  executiveSummary: BoreholesExecutiveSummary
  activities: BoreholesActivityBlock[]
}): BoreholesActivityReportPdfLayout {
  const { meta, executiveSummary: exec, activities } = input

  const keyIndicators: [string, string][] = [
    ['Licence applications (period)', String(exec.licenceApplicationsInPeriod)],
    ['Licences approved (period)', String(exec.licencesApproved)],
    ['Licences rejected (period)', String(exec.licencesRejected)],
    ['Drilling companies (register)', String(exec.drillingCompaniesTotal)],
    ['Active companies', String(exec.drillingCompaniesActive)],
    ['Registry queue (received)', String(exec.registryPendingQueue)],
    ['Survey123 intakes (period)', String(exec.survey123IntakesInPeriod)],
    ['Registered boreholes (period)', String(exec.registeredBoreholesInPeriod)],
    ['Budget allocated', formatNLe(exec.budgetAllocatedSle)],
    ['Budget utilized', formatNLe(exec.budgetUtilizedSle)],
    [
      'Budget utilization',
      exec.budgetUtilizationPct != null ? `${exec.budgetUtilizationPct}%` : '—',
    ],
  ]

  const sectionTables = activities.map((block) => ({
    title: block.title,
    head: block.columns.map((c) => c.label),
    body: block.rows.map((row) => block.columns.map((c) => cell(row[c.key]))),
  }))

  return {
    title: 'Boreholes Department Activity Report',
    subtitle: meta.organisation,
    periodLine: `Reporting period: ${meta.periodLabel}`,
    generatedLine: `Generated: ${formatDateTime(new Date(meta.generatedAt))}`,
    intro: INTRO,
    keyIndicators,
    sectionTables,
    footerTagline:
      'National Water Resources Management Agency — Sierra Leone · Boreholes Department · Confidential management use',
  }
}
