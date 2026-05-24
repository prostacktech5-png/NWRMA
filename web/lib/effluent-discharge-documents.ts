export type EffluentDischargeDocumentSlotId =
  | 'sitePlan'
  | 'projectDescriptionDoc'
  | 'eiaEsmpPermits'
  | 'wastewaterManagementPlan'
  | 'businessParticulars'
  | 'environmentalImpactReport'
  | 'environmentalPermitSchedule'
  | 'otherMdaPermits'
  | 'waterDemandManagementPlan'
  | 'businessCertificates'
  | 'bankReceipt'

export type EffluentDischargeRequiredDocument = {
  id: EffluentDischargeDocumentSlotId
  label: string
  description: string
  optional?: boolean
}

export const EFFLUENT_DISCHARGE_REQUIRED_DOCUMENTS: EffluentDischargeRequiredDocument[] = [
  {
    id: 'sitePlan',
    label: 'Site plan',
    description:
      '(a) Infrastructure including intake, treatment facilities, effluent point, and water meters',
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
    id: 'wastewaterManagementPlan',
    label: 'Wastewater Management Plan (WMP)',
    description: '(d) Preliminary WMP for consumptive uses and effluent discharge',
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

export const EFFLUENT_DISCHARGE_REQUIRED_SLOTS = EFFLUENT_DISCHARGE_REQUIRED_DOCUMENTS.filter(
  (d) => !d.optional
)

/** Collected via payment intake — not listed on the public document upload step */
export const EFFLUENT_DISCHARGE_PAYMENT_INTAKE_SLOTS: EffluentDischargeDocumentSlotId[] = [
  'bankReceipt',
]

export const ALL_EFFLUENT_DISCHARGE_SLOT_IDS: EffluentDischargeDocumentSlotId[] = [
  ...EFFLUENT_DISCHARGE_REQUIRED_DOCUMENTS.map((d) => d.id),
  ...EFFLUENT_DISCHARGE_PAYMENT_INTAKE_SLOTS,
]

export function emptyEffluentDischargeDocumentFiles(): Record<
  EffluentDischargeDocumentSlotId,
  File[]
> {
  const slots = {} as Record<EffluentDischargeDocumentSlotId, File[]>
  for (const id of ALL_EFFLUENT_DISCHARGE_SLOT_IDS) slots[id] = []
  return slots
}

export function emptyEffluentDischargeDocumentMeta(): Record<
  EffluentDischargeDocumentSlotId,
  import('@/lib/types').EffluentDischargeDocumentMeta[]
> {
  const slots = {} as Record<
    EffluentDischargeDocumentSlotId,
    import('@/lib/types').EffluentDischargeDocumentMeta[]
  >
  for (const id of ALL_EFFLUENT_DISCHARGE_SLOT_IDS) slots[id] = []
  return slots
}
