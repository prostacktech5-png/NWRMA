import { REQUIRED_DOCUMENT_SLOTS } from '@/lib/borehole-licensing-documents'
import { DAM_SAFETY_REQUIRED_SLOTS } from '@/lib/dam-safety-documents'
import { EFFLUENT_DISCHARGE_REQUIRED_SLOTS } from '@/lib/effluent-discharge-documents'
import { coerceToValidDate } from '@/lib/erp-formatting'
import type { DamSafetyFormPayload } from '@/lib/nwrma-site/online-forms/dam-safety-schema'
import type { EffluentDischargeFormPayload } from '@/lib/nwrma-site/online-forms/effluent-discharge-schema'
import type { WaterDrillingLicenceFormPayload } from '@/lib/nwrma-site/online-forms/water-drilling-licence-schema'
import type { WaterRightFormPayload } from '@/lib/nwrma-site/online-forms/water-right-schema'
import { WATER_RIGHT_REQUIRED_SLOTS } from '@/lib/water-right-documents'
import type {
  BoreholeLicenseApplication,
  DamSafetyApplication,
  EffluentDischargeApplication,
  WaterRightApplication,
} from '@/lib/types'

export type CompletenessIssue = {
  label: string
  path: string
  kind: 'empty_field' | 'empty_table_cell' | 'missing_document' | 'checklist'
}

export type CompletenessReport = {
  issues: CompletenessIssue[]
  summary: {
    total: number
    emptyFields: number
    missingDocs: number
  }
}

export function isBlank(value: unknown): boolean {
  if (value == null) return true
  if (value instanceof Date) return !coerceToValidDate(value)
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

function issue(
  label: string,
  path: string,
  kind: CompletenessIssue['kind'] = 'empty_field'
): CompletenessIssue {
  return { label, path, kind }
}

function countMissingDocs(
  slots: { id: string; label: string }[],
  documents: Record<string, unknown[] | undefined> | undefined
): CompletenessIssue[] {
  const out: CompletenessIssue[] = []
  for (const slot of slots) {
    const files = documents?.[slot.id]
    if (!files || files.length === 0) {
      out.push(issue(`Missing upload: ${slot.label}`, `documents.${slot.id}`, 'missing_document'))
    }
  }
  return out
}

function scanEquipmentRows(
  rows: { description: string; qtyAvailable: string }[],
  tableLabel: string,
  prefix: string
): CompletenessIssue[] {
  const out: CompletenessIssue[] = []
  rows.forEach((row, i) => {
    if (isBlank(row.qtyAvailable)) {
      out.push(
        issue(
          `${tableLabel} — row ${i + 1}: Qty available not stated (${row.description})`,
          `${prefix}[${i}].qtyAvailable`,
          'empty_table_cell'
        )
      )
    }
  })
  return out
}

function scanPersonnelRows(
  rows: { role: string; qualification: string }[],
  tableLabel: string,
  prefix: string
): CompletenessIssue[] {
  const out: CompletenessIssue[] = []
  rows.forEach((row, i) => {
    if (isBlank(row.qualification)) {
      out.push(
        issue(
          `${tableLabel} — ${row.role}: qualification not stated`,
          `${prefix}[${i}].qualification`,
          'empty_table_cell'
        )
      )
    }
  })
  return out
}

function scanYesNoChecklist(
  entries: { key: string; label: string; included: string; reasonIfNo?: string }[]
): CompletenessIssue[] {
  const out: CompletenessIssue[] = []
  for (const e of entries) {
    if (isBlank(e.included)) {
      out.push(issue(`Checklist: ${e.label} not answered`, `includedDocuments.${e.key}`, 'checklist'))
    } else if (e.included === 'no' && isBlank(e.reasonIfNo)) {
      out.push(
        issue(`Checklist: ${e.label} marked No without reason`, `includedDocuments.${e.key}`, 'checklist')
      )
    }
  }
  return out
}

function finalize(issues: CompletenessIssue[]): CompletenessReport {
  const emptyFields = issues.filter(
    (i) => i.kind === 'empty_field' || i.kind === 'empty_table_cell' || i.kind === 'checklist'
  ).length
  const missingDocs = issues.filter((i) => i.kind === 'missing_document').length
  return {
    issues,
    summary: { total: issues.length, emptyFields, missingDocs },
  }
}

export function scanWaterDrillingCompleteness(
  application: BoreholeLicenseApplication
): CompletenessReport {
  const issues: CompletenessIssue[] = []
  const ext = application.extendedForm
  if (!ext) return finalize(issues)

  const textFields: [string, string, unknown][] = [
    ['Company name', 'companyName', ext.companyName],
    ['Address', 'address', ext.address],
    ['Tel', 'phone', ext.phone],
    ['Email', 'email', ext.email],
    ['Contact person', 'contactName', ext.contactName],
    ['Contact email', 'contactEmail', ext.contactEmail],
    ['Contact phone', 'contactPhone', ext.contactPhone],
    ['Registered Company No.', 'regNumber', ext.regNumber],
    ['Bankers', 'bankers', ext.bankers],
    ['Operating district', 'district', ext.district],
    ['Projects (last 5 years)', 'projectsLast5Years', ext.projectsLast5Years],
    ['Referee 1 name', 'referee1.name', ext.referee1.name],
    ['Referee 1 address', 'referee1.address', ext.referee1.address],
    ['Referee 2 name', 'referee2.name', ext.referee2.name],
    ['Referee 2 address', 'referee2.address', ext.referee2.address],
    ['Declaration signature', 'declarationSignature', ext.declarationSignature],
    ['Declaration date', 'declarationDate', ext.declarationDate],
  ]
  for (const [label, path, value] of textFields) {
    if (isBlank(value)) issues.push(issue(label, path))
  }

  ext.directors.forEach((d, i) => {
    if (isBlank(d.fullName) || isBlank(d.citizenship)) {
      issues.push(issue(`Director row ${i + 1} incomplete`, `directors[${i}]`, 'empty_table_cell'))
    }
  })

  issues.push(
    ...scanEquipmentRows(ext.boreholeClassA, 'Equipment CLASS A', 'boreholeClassA'),
    ...scanEquipmentRows(ext.boreholeClassB, 'Equipment CLASS B', 'boreholeClassB'),
    ...scanEquipmentRows(ext.boreholeClassC, 'Equipment CLASS C', 'boreholeClassC'),
    ...scanEquipmentRows(ext.handDugWell, 'Hand dug well equipment', 'handDugWell'),
    ...scanPersonnelRows(ext.boreholePersonnel, 'Borehole drilling personnel', 'boreholePersonnel'),
    ...scanPersonnelRows(ext.handDugPersonnel, 'Hand dug well personnel', 'handDugPersonnel')
  )

  issues.push(...countMissingDocs(REQUIRED_DOCUMENT_SLOTS, application.documents))
  return finalize(issues)
}

const DAM_SAFETY_REQUIRED_TEXT: [string, (f: DamSafetyFormPayload) => unknown][] = [
  ['Company / organisation', (f) => f.companyName],
  ['CEO / Director', (f) => f.ceoDirectorName],
  ['Contact person', (f) => f.contactPersonName],
  ['Mailing address', (f) => f.mailingAddress],
  ['Email', (f) => f.email],
  ['Dam GPS', (f) => f.damGpsCoordinates],
  ['Project description', (f) => f.projectDescription],
  ['Environmental impacts', (f) => f.environmentalImpacts],
  ['Pollution mitigation', (f) => f.pollutionMitigationMeasures],
  ['Declaration signature', (f) => f.declarationSignature],
  ['Declaration print name', (f) => f.declarationPrintName],
  ['Declaration date', (f) => f.declarationDate],
]

export function scanDamSafetyCompleteness(application: DamSafetyApplication): CompletenessReport {
  const issues: CompletenessIssue[] = []
  const form = application.extendedForm
  if (!form) return finalize(issues)

  for (const [label, getter] of DAM_SAFETY_REQUIRED_TEXT) {
    if (isBlank(getter(form))) issues.push(issue(label, label))
  }

  if (!form.purposes?.length) {
    issues.push(issue('Purpose(s) of water use', 'purposes'))
  }

  issues.push(
    ...scanYesNoChecklist([
      { key: 'eiaReport', label: 'EIA report', ...form.includedDocuments.eiaReport },
      {
        key: 'environmentalPermit',
        label: 'Environmental permit & schedule',
        ...form.includedDocuments.environmentalPermit,
      },
      { key: 'otherMdaPermits', label: 'Other MDA permits', ...form.includedDocuments.otherMdaPermits },
      { key: 'sitePlan', label: 'Site plan', ...form.includedDocuments.sitePlan },
      { key: 'wdmp', label: 'Water demand management plan', ...form.includedDocuments.wdmp },
      {
        key: 'businessCertificates',
        label: 'Business certificates',
        ...form.includedDocuments.businessCertificates,
      },
    ])
  )

  // Activity sections (9–24): always shown in review UI; typically N/A except for selected water use.

  issues.push(...countMissingDocs(DAM_SAFETY_REQUIRED_SLOTS, application.documents))
  return finalize(issues)
}

const EFFLUENT_REQUIRED_TEXT: [string, (f: EffluentDischargeFormPayload) => unknown][] = [
  ['Company / organisation', (f) => f.companyName],
  ['Contact person', (f) => f.contactPersonName],
  ['Email', (f) => f.email],
  ['Project description', (f) => f.projectDescription],
  ['Declaration signature', (f) => f.declarationSignature],
  ['Declaration print name', (f) => f.declarationPrintName],
  ['Declaration date', (f) => f.declarationDate],
]

export function scanEffluentDischargeCompleteness(
  application: EffluentDischargeApplication
): CompletenessReport {
  const issues: CompletenessIssue[] = []
  const form = application.extendedForm
  if (!form) return finalize(issues)

  for (const [label, getter] of EFFLUENT_REQUIRED_TEXT) {
    if (isBlank(getter(form))) issues.push(issue(label, label))
  }

  issues.push(
    ...scanYesNoChecklist([
      { key: 'eiaReport', label: 'EIA report', ...form.includedDocuments.eiaReport },
      {
        key: 'environmentalPermit',
        label: 'Environmental permit & schedule',
        ...form.includedDocuments.environmentalPermit,
      },
      { key: 'otherMdaPermits', label: 'Other MDA permits', ...form.includedDocuments.otherMdaPermits },
      { key: 'sitePlan', label: 'Site plan', ...form.includedDocuments.sitePlan },
      { key: 'wdmp', label: 'Water demand management plan', ...form.includedDocuments.wdmp },
      {
        key: 'businessCertificates',
        label: 'Business certificates',
        ...form.includedDocuments.businessCertificates,
      },
    ])
  )

  issues.push(...countMissingDocs(EFFLUENT_DISCHARGE_REQUIRED_SLOTS, application.documents))
  return finalize(issues)
}

const WATER_RIGHT_REQUIRED_TEXT: [string, (f: WaterRightFormPayload) => unknown][] = [
  ['Company / organisation', (f) => f.companyName],
  ['Contact person', (f) => f.contactPersonName],
  ['Email', (f) => f.email],
  ['Project description', (f) => f.projectDescription],
  ['Declaration signature', (f) => f.declarationSignature],
  ['Declaration print name', (f) => f.declarationPrintName],
  ['Declaration date', (f) => f.declarationDate],
]

export function scanWaterRightCompleteness(
  application: WaterRightApplication
): CompletenessReport {
  const issues: CompletenessIssue[] = []
  const form = application.extendedForm
  if (!form) return finalize(issues)

  for (const [label, getter] of WATER_RIGHT_REQUIRED_TEXT) {
    if (isBlank(getter(form))) issues.push(issue(label, label))
  }

  issues.push(
    ...scanYesNoChecklist([
      { key: 'eiaReport', label: 'EIA report', ...form.includedDocuments.eiaReport },
      {
        key: 'environmentalPermit',
        label: 'Environmental permit & schedule',
        ...form.includedDocuments.environmentalPermit,
      },
      { key: 'otherMdaPermits', label: 'Other MDA permits', ...form.includedDocuments.otherMdaPermits },
      { key: 'sitePlan', label: 'Site plan', ...form.includedDocuments.sitePlan },
      { key: 'wdmp', label: 'Water demand management plan', ...form.includedDocuments.wdmp },
      {
        key: 'businessCertificates',
        label: 'Business certificates',
        ...form.includedDocuments.businessCertificates,
      },
    ])
  )

  issues.push(...countMissingDocs(WATER_RIGHT_REQUIRED_SLOTS, application.documents))
  return finalize(issues)
}
