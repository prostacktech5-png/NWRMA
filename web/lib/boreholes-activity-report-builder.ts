import type { User } from '@/lib/types'
import { isOrgWideRole } from '@/lib/department-scope'
import { departmentNames, licenseApplicationStatusLabels } from '@/lib/erp-formatting'
import { loadOrSeedErpReferencePayload } from '@/lib/db/reference-data-persistence'
import { listSurvey123Intakes } from '@/lib/db/borehole-registry-persistence'
import { companyNameMap } from '@/lib/borehole-intake-approve'
import { buildDepartmentBudgetOverviewFromStore } from '@/lib/finance-api-store'
import { buildBoreholesActivityPdfLayout } from '@/lib/boreholes-activity-report-pdf-layout'
import type {
  BoreholesActivityBlock,
  BoreholesActivityReportMeta,
  BoreholesActivityReportResponse,
  BoreholesExecutiveSummary,
  BoreholesReportSectionKey,
} from '@/lib/boreholes-activity-report.types'
import type { BoreholeLicenseApplication } from '@/lib/types'

export function canViewBoreholesActivityReport(user: User): boolean {
  if (user.role === 'dg' || isOrgWideRole(user)) return true
  return user.department === 'boreholes'
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

function periodLabelEn(start: Date, end: Date): string {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return `${fmt.format(start)} – ${fmt.format(end)}`
}

function licenceInPeriod(app: BoreholeLicenseApplication, periodStart: Date, periodEnd: Date): boolean {
  const submitted = new Date(app.submittedAt)
  if (inPeriod(submitted, periodStart, periodEnd)) return true
  if (app.reviewedAt) {
    return inPeriod(new Date(app.reviewedAt), periodStart, periodEnd)
  }
  return false
}

export async function buildBoreholesActivityReport(input: {
  periodStart: Date
  periodEnd: Date
  sections: BoreholesReportSectionKey[]
}): Promise<BoreholesActivityReportResponse> {
  const { periodStart, periodEnd } = input
  const includedSections = [...new Set(input.sections)]

  const erp = await loadOrSeedErpReferencePayload()
  const companyNames = companyNameMap(erp.drillingCompanies)
  const allIntakes = await listSurvey123Intakes(undefined, companyNames)

  const licencesInPeriod = erp.licenseApplications.filter((a) =>
    licenceInPeriod(a, periodStart, periodEnd)
  )

  const intakesInPeriod = allIntakes.filter((i) =>
    inPeriod(new Date(i.receivedAt), periodStart, periodEnd)
  )

  const pendingIntakes = allIntakes.filter((i) => i.status === 'received')
  const pendingInPeriod = intakesInPeriod.filter((i) => i.status === 'received')

  const approvedBoreholes = erp.boreholes.filter((b) => b.registryStatus === 'approved')
  const boreholesInPeriod = approvedBoreholes.filter((b) =>
    inPeriod(new Date(b.createdAt), periodStart, periodEnd)
  )

  let budgetLines: Awaited<ReturnType<typeof buildDepartmentBudgetOverviewFromStore>>['lines'] =
    []
  let budgetTotals = { totalAllocated: 0, totalUtilized: 0, totalAvailable: 0 }
  if (includedSections.includes('budget')) {
    const budget = await buildDepartmentBudgetOverviewFromStore('boreholes')
    budgetLines = budget.lines
    budgetTotals = budget.totals
  }

  const utilPct =
    budgetTotals.totalAllocated > 0
      ? Math.round((budgetTotals.totalUtilized / budgetTotals.totalAllocated) * 1000) / 10
      : null

  const exec: BoreholesExecutiveSummary = {
    licenceApplicationsInPeriod: licencesInPeriod.length,
    licencesSubmitted: licencesInPeriod.filter((a) => a.status === 'submitted').length,
    licencesUnderReview: licencesInPeriod.filter((a) => a.status === 'under_review').length,
    licencesApproved: licencesInPeriod.filter((a) => a.status === 'approved').length,
    licencesRejected: licencesInPeriod.filter((a) => a.status === 'rejected').length,
    licencesAdditionalInfo: licencesInPeriod.filter(
      (a) => a.status === 'additional_info_required'
    ).length,
    drillingCompaniesTotal: erp.drillingCompanies.length,
    drillingCompaniesActive: erp.drillingCompanies.filter((c) => c.status === 'active').length,
    registryPendingQueue: pendingIntakes.length,
    registryIntakesReceivedInPeriod: intakesInPeriod.length,
    registeredBoreholesInPeriod: boreholesInPeriod.length,
    registeredBoreholesTotal: approvedBoreholes.length,
    survey123IntakesInPeriod: intakesInPeriod.length,
    survey123RegisteredInPeriod: intakesInPeriod.filter((i) => i.status === 'registered').length,
    survey123RejectedInPeriod: intakesInPeriod.filter((i) => i.status === 'rejected').length,
    budgetLines: budgetLines.length,
    budgetAllocatedSle: budgetTotals.totalAllocated,
    budgetUtilizedSle: budgetTotals.totalUtilized,
    budgetAvailableSle: budgetTotals.totalAvailable,
    budgetUtilizationPct: utilPct,
  }

  const activities: BoreholesActivityBlock[] = []

  if (includedSections.includes('licences')) {
    activities.push({
      section: 'licences',
      title: 'Drilling licence applications',
      narrative:
        'Portal submissions and review outcomes where submission or review date falls within the report period.',
      columns: [
        { key: 'reference', label: 'Reference' },
        { key: 'company', label: 'Company' },
        { key: 'district', label: 'District' },
        { key: 'submitted', label: 'Submitted' },
        { key: 'status', label: 'Status' },
        { key: 'reviewed', label: 'Reviewed' },
      ],
      rows: licencesInPeriod
        .slice()
        .sort(
          (a, b) =>
            new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        )
        .map((a) => ({
          reference: a.reference,
          company: a.companyName,
          district: a.district,
          submitted: new Date(a.submittedAt).toISOString(),
          status: licenseApplicationStatusLabels[a.status] ?? a.status,
          reviewed: a.reviewedAt ? new Date(a.reviewedAt).toISOString() : null,
        })),
    })
  }

  if (includedSections.includes('companies')) {
    activities.push({
      section: 'companies',
      title: 'Registered drilling companies',
      narrative: 'Full company register snapshot (not limited to the reporting period).',
      columns: [
        { key: 'name', label: 'Company' },
        { key: 'registration', label: 'Registration no.' },
        { key: 'status', label: 'Status' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'licenseExpiry', label: 'Licence expiry' },
      ],
      rows: erp.drillingCompanies.map((c) => ({
        name: c.name,
        registration: c.registrationNo,
        status: c.status,
        email: c.contacts.email,
        phone: c.contacts.phone,
        licenseExpiry: new Date(c.licenseExpiry).toISOString().slice(0, 10),
      })),
    })
  }

  if (includedSections.includes('registry')) {
    activities.push({
      section: 'registry',
      title: 'Registry review queue',
      narrative:
        'Survey123 intakes still awaiting registry approval, received within the reporting period.',
      columns: [
        { key: 'id', label: 'Intake ID' },
        { key: 'company', label: 'Drilling company' },
        { key: 'district', label: 'District' },
        { key: 'received', label: 'Received' },
        { key: 'mapping', label: 'Mapping complete' },
      ],
      rows: pendingInPeriod
        .slice()
        .sort(
          (a, b) =>
            new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
        )
        .map((i) => ({
          id: i.idPreview ?? i.id,
          company: i.matchedCompanyName ?? i.drillingCompanyName ?? '—',
          district: i.districtLabel ?? '—',
          received: new Date(i.receivedAt).toISOString(),
          mapping: i.mappingComplete ? 'Yes' : 'No',
        })),
    })

    activities.push({
      section: 'registry',
      title: 'Registered boreholes',
      narrative: 'Boreholes approved and registered with created date in the reporting period.',
      columns: [
        { key: 'code', label: 'Borehole code' },
        { key: 'district', label: 'District' },
        { key: 'region', label: 'Region' },
        { key: 'company', label: 'Drilling company' },
        { key: 'depth', label: 'Depth (m)' },
        { key: 'registered', label: 'Registered' },
      ],
      rows: boreholesInPeriod
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .map((b) => ({
          code: b.code,
          district: b.district,
          region: b.region,
          company: b.drillingCompanyName ?? '—',
          depth: b.depthM,
          registered: new Date(b.createdAt).toISOString(),
        })),
    })
  }

  if (includedSections.includes('survey123')) {
    activities.push({
      section: 'survey123',
      title: 'Survey123 borehole intakes',
      narrative: 'Field intakes received within the reporting period (all workflow states).',
      columns: [
        { key: 'id', label: 'Intake ID' },
        { key: 'status', label: 'Status' },
        { key: 'company', label: 'Company' },
        { key: 'district', label: 'District' },
        { key: 'depth', label: 'Depth (m)' },
        { key: 'yield', label: 'Yield (L/s)' },
        { key: 'received', label: 'Received' },
      ],
      rows: intakesInPeriod
        .slice()
        .sort(
          (a, b) =>
            new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
        )
        .map((i) => ({
          id: i.idPreview ?? i.id,
          status: i.status,
          company: i.matchedCompanyName ?? i.drillingCompanyName ?? '—',
          district: i.districtLabel ?? '—',
          depth: i.boreholeDepthM,
          yield: i.yieldLps,
          received: new Date(i.receivedAt).toISOString(),
        })),
    })
  }

  if (includedSections.includes('budget')) {
    activities.push({
      section: 'budget',
      title: 'Boreholes programme budget (active FY snapshot)',
      narrative:
        'Allocated and utilized amounts for boreholes department budget lines. Figures are not prorated to the report window.',
      columns: [
        { key: 'code', label: 'Budget code' },
        { key: 'project', label: 'Project' },
        { key: 'fiscalYear', label: 'Fiscal year' },
        { key: 'allocated', label: 'Allocated (SLE)' },
        { key: 'utilized', label: 'Utilized (SLE)' },
        { key: 'available', label: 'Available (SLE)' },
      ],
      rows: budgetLines.map((l) => ({
        code: l.budgetCode,
        project: l.project,
        fiscalYear: l.fiscalYear,
        allocated: l.totalAmount,
        utilized: l.utilizedAmount,
        available: l.availableBalance,
      })),
    })
  }

  const meta: BoreholesActivityReportMeta = {
    generatedAt: new Date().toISOString(),
    periodLabel: periodLabelEn(periodStart, periodEnd),
    periodStart: startOfDay(periodStart).toISOString(),
    periodEnd: endOfDay(periodEnd).toISOString(),
    organisation: 'National Water Resources Management Agency — Sierra Leone',
    department: departmentNames.boreholes,
    includedSections,
  }

  const rollups: BoreholesActivityReportResponse['rollups'] = {}
  if (includedSections.includes('licences')) {
    const byStatus: { status: string; count: number }[] = []
    for (const st of [
      'submitted',
      'under_review',
      'additional_info_required',
      'approved',
      'rejected',
    ] as const) {
      const n = licencesInPeriod.filter((a) => a.status === st).length
      if (n > 0) {
        byStatus.push({
          status: licenseApplicationStatusLabels[st] ?? st,
          count: n,
        })
      }
    }
    rollups.licencesByStatus = byStatus
  }
  if (includedSections.includes('survey123')) {
    rollups.survey123ByStatus = ['received', 'registered', 'rejected'].map((st) => ({
      status: st,
      count: intakesInPeriod.filter((i) => i.status === st).length,
    }))
  }

  const pdfLayout = buildBoreholesActivityPdfLayout({
    meta,
    executiveSummary: exec,
    activities,
  })

  return {
    meta,
    executiveSummary: exec,
    activities,
    rollups,
    pdfLayout,
  }
}
