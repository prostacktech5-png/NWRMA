import { ERP_DEPARTMENTS } from '@/lib/org-departments'
import type { Department } from '@/lib/types'

/** Platform resources hidden from department RBAC UI (super-admin infrastructure). */
export const EXCLUDED_PLATFORM_RESOURCES = new Set([
  'api',
  'audit',
  'backup',
  'system',
  'notifications',
  'users',
  'gis',
])

export type DepartmentSection = {
  /** Stable id, e.g. hydrological:readings */
  id: string
  department: Exclude<Department, null>
  label: string
  hrefPrefix: string
}

/** ERP departments that have assignable in-app sections (excludes DG executive). */
export const ERP_DEPARTMENTS_FOR_RBAC = ERP_DEPARTMENTS

const SECTIONS_BY_DEPARTMENT: Record<Exclude<Department, null>, Omit<DepartmentSection, 'department'>[]> =
  {
    hydrological: [
      { id: 'hydrological:readings', label: 'Water level reading', hrefPrefix: '/hydrological/readings' },
      { id: 'hydrological:monitoring', label: 'Flood forecasting', hrefPrefix: '/hydrological/monitoring' },
      {
        id: 'hydrological:lab_queue',
        label: 'Water testing',
        hrefPrefix: '/hydrological/water-testing',
      },
      { id: 'hydrological:budget', label: 'Budget', hrefPrefix: '/hydrological/budget' },
      {
        id: 'hydrological:departmental_report',
        label: 'Report',
        hrefPrefix: '/hydrological/budget/reports',
      },
      {
        id: 'hydrological:documents',
        label: 'Document sharing',
        hrefPrefix: '/hydrological/documents',
      },
      {
        id: 'hydrological:application_processing',
        label: 'Application processing unit',
        hrefPrefix: '/hydrological/application-processing-unit',
      },
    ],
    boreholes: [
      { id: 'boreholes:registry', label: 'Registry', hrefPrefix: '/boreholes/registry' },
      {
        id: 'boreholes:license_applications',
        label: 'Review drilling licence',
        hrefPrefix: '/boreholes/license-applications',
      },
      { id: 'boreholes:companies', label: 'Companies', hrefPrefix: '/boreholes/companies' },
      { id: 'boreholes:survey123', label: 'Survey123 Borehole data', hrefPrefix: '/boreholes/survey123' },
      { id: 'boreholes:budget', label: 'Budget', hrefPrefix: '/boreholes/budget' },
      { id: 'boreholes:reports', label: 'Reports', hrefPrefix: '/boreholes/reports' },
      {
        id: 'boreholes:documents',
        label: 'Document sharing',
        hrefPrefix: '/boreholes/documents',
      },
    ],
    financial: [
      {
        id: 'financial:payments',
        label: 'Officer payments',
        hrefPrefix: '/finance/payments',
      },
      {
        id: 'financial:bank_receipt_validation',
        label: 'Bank Receipt Validation Desk',
        hrefPrefix: '/finance/bank-receipt-validation',
      },
      { id: 'financial:requisitions', label: 'Requisitions', hrefPrefix: '/finance/requisitions' },
      { id: 'financial:budgets', label: 'Budgets', hrefPrefix: '/finance/budgets' },
      { id: 'financial:summary', label: 'Summary', hrefPrefix: '/finance/summary' },
      { id: 'financial:reports', label: 'Reports', hrefPrefix: '/finance/reports' },
      {
        id: 'financial:documents',
        label: 'Document sharing',
        hrefPrefix: '/finance/documents',
      },
    ],
    hr: [
      { id: 'hr:dashboard', label: 'Dashboard', hrefPrefix: '/hr' },
      { id: 'hr:staff', label: 'Staff & Volunteers', hrefPrefix: '/hr/staff' },
      { id: 'hr:assets', label: 'Assets', hrefPrefix: '/hr/assets' },
      { id: 'hr:payroll', label: 'Payroll', hrefPrefix: '/hr/payroll' },
      { id: 'hr:subscriptions', label: 'Subscriptions', hrefPrefix: '/hr/subscriptions' },
      { id: 'hr:birthdays', label: 'Birthdays', hrefPrefix: '/hr/birthdays' },
      { id: 'hr:leave', label: 'Leave', hrefPrefix: '/hr/leave' },
      { id: 'hr:requisitions', label: 'Requisitions', hrefPrefix: '/hr/requisitions' },
      { id: 'hr:reports', label: 'Reports', hrefPrefix: '/hr/reports' },
      { id: 'hr:documents', label: 'Document sharing', hrefPrefix: '/hr/documents' },
    ],
    compliance: [
      { id: 'compliance:dashboard', label: 'Dashboard', hrefPrefix: '/compliance' },
      {
        id: 'compliance:register',
        label: 'Compliance unit',
        hrefPrefix: '/compliance/compliance-register',
      },
      { id: 'compliance:legal', label: 'Legal unit', hrefPrefix: '/compliance/legal' },
      {
        id: 'compliance:outreach',
        label: 'Communications unit',
        hrefPrefix: '/compliance/communications',
      },
      {
        id: 'compliance:regulations',
        label: 'Regulations library',
        hrefPrefix: '/compliance/regulations',
      },
      { id: 'compliance:budget', label: 'Budget', hrefPrefix: '/compliance/budget' },
      { id: 'compliance:reports', label: 'Reports', hrefPrefix: '/compliance/reports' },
      {
        id: 'compliance:documents',
        label: 'Document sharing',
        hrefPrefix: '/compliance/documents',
      },
    ],
  }

export function getSectionsForDepartment(
  dept: Exclude<Department, null>,
): DepartmentSection[] {
  return (SECTIONS_BY_DEPARTMENT[dept] ?? []).map((s) => ({ ...s, department: dept }))
}

export function getAllDepartmentSections(): DepartmentSection[] {
  return ERP_DEPARTMENTS_FOR_RBAC.flatMap((d) => getSectionsForDepartment(d.value))
}

export function findSectionById(sectionId: string): DepartmentSection | undefined {
  return getAllDepartmentSections().find((s) => s.id === sectionId)
}

export function departmentOverviewHref(dept: Exclude<Department, null>): string | null {
  const first = getSectionsForDepartment(dept)[0]
  if (!first) return null
  if (dept === 'hydrological') return '/hydrological'
  if (dept === 'boreholes') return '/boreholes'
  if (dept === 'hr') return '/hr'
  if (dept === 'compliance') return '/compliance'
  return first.hrefPrefix
}

/** Match pathname to a section (longest prefix wins). */
export function sectionForPathname(pathname: string): DepartmentSection | undefined {
  let best: DepartmentSection | undefined
  let bestLen = 0
  for (const s of getAllDepartmentSections()) {
    const prefix = s.hrefPrefix
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      if (prefix.length >= bestLen) {
        best = s
        bestLen = prefix.length
      }
    }
  }
  return best
}

export function departmentForPathname(pathname: string): Exclude<Department, null> | null {
  const section = sectionForPathname(pathname)
  return section?.department ?? null
}
