export type DamSafetyDocumentSlotId =
  | 'sitePlan'
  | 'projectDescriptionDoc'
  | 'eiaEsmpPermits'
  | 'dcmpPreliminary'
  | 'businessParticulars'
  | 'environmentalImpactReport'
  | 'environmentalPermitSchedule'
  | 'otherMdaPermits'
  | 'waterDemandManagementPlan'
  | 'businessCertificates'
  | 'bankReceipt'

export type DamSafetyRequiredDocument = {
  id: DamSafetyDocumentSlotId
  label: string
  description: string
  optional?: boolean
}

export const DAM_SAFETY_REQUIRED_DOCUMENTS: DamSafetyRequiredDocument[] = [
  {
    id: 'sitePlan',
    label: 'Site plan',
    description: '(a) Components of proposed infrastructure (intake, dams, pipelines, etc.)',
  },
  {
    id: 'projectDescriptionDoc',
    label: 'Project description document',
    description: '(b) General description of water use and works',
  },
  {
    id: 'eiaEsmpPermits',
    label: 'EIA / ESMP / related permits',
    description: '(c) EPA, NMA, Ministry of Energy, Local Councils, etc.',
  },
  {
    id: 'dcmpPreliminary',
    label: 'Dam Construction and Management Plan (DCMP)',
    description: '(d) Preliminary DCMP for consumptive uses and effluent discharge',
    optional: true,
  },
  {
    id: 'businessParticulars',
    label: 'Business particulars',
    description: '(e) Registration, objects, representatives (private businesses)',
    optional: true,
  },
  {
    id: 'environmentalImpactReport',
    label: 'Environmental Impact Assessment Report',
    description: 'Section 4.0 — EIA report',
    optional: true,
  },
  {
    id: 'environmentalPermitSchedule',
    label: 'Environmental Permit & Schedule',
    description: 'Section 4.0',
    optional: true,
  },
  {
    id: 'otherMdaPermits',
    label: 'Other relevant permits / licences / letters from MDAs',
    description: 'Section 4.0',
    optional: true,
  },
  {
    id: 'waterDemandManagementPlan',
    label: 'Water Demand Management Plan',
    description: 'Section 4.0 — consumptive uses only',
    optional: true,
  },
  {
    id: 'businessCertificates',
    label: 'Business certificates',
    description: 'Section 4.0 — private establishments',
    optional: true,
  },
]

export const DAM_SAFETY_REQUIRED_SLOTS = DAM_SAFETY_REQUIRED_DOCUMENTS.filter((d) => !d.optional)

/** Collected via payment intake — not listed on the public document upload step */
export const DAM_SAFETY_PAYMENT_INTAKE_SLOTS: DamSafetyDocumentSlotId[] = ['bankReceipt']

export const ALL_DAM_SAFETY_SLOT_IDS: DamSafetyDocumentSlotId[] = [
  ...DAM_SAFETY_REQUIRED_DOCUMENTS.map((d) => d.id),
  ...DAM_SAFETY_PAYMENT_INTAKE_SLOTS,
]

export function emptyDamSafetyDocumentFiles(): Record<DamSafetyDocumentSlotId, File[]> {
  const slots = {} as Record<DamSafetyDocumentSlotId, File[]>
  for (const id of ALL_DAM_SAFETY_SLOT_IDS) slots[id] = []
  return slots
}

export function emptyDamSafetyDocumentMeta(): Record<
  DamSafetyDocumentSlotId,
  import('@/lib/types').DamSafetyDocumentMeta[]
> {
  const slots = {} as Record<DamSafetyDocumentSlotId, import('@/lib/types').DamSafetyDocumentMeta[]>
  for (const id of ALL_DAM_SAFETY_SLOT_IDS) slots[id] = []
  return slots
}
