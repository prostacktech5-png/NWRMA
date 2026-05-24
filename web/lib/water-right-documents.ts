export type WaterRightDocumentSlotId =
  | 'sitePlan'
  | 'projectDescriptionDoc'
  | 'eiaEsmpPermits'
  | 'businessParticulars'
  | 'environmentalImpactReport'
  | 'environmentalPermitSchedule'
  | 'otherMdaPermits'
  | 'waterDemandManagementPlan'
  | 'businessCertificates'
  | 'bankReceipt'

export type WaterRightRequiredDocument = {
  id: WaterRightDocumentSlotId
  label: string
  description: string
  optional?: boolean
}

export const WATER_RIGHT_REQUIRED_DOCUMENTS: WaterRightRequiredDocument[] = [
  {
    id: 'sitePlan',
    label: 'Site plan',
    description:
      '(a) Infrastructure including intake, dams, pipelines, treatment facilities, effluent point, and water meters',
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

export const WATER_RIGHT_REQUIRED_SLOTS = WATER_RIGHT_REQUIRED_DOCUMENTS.filter((d) => !d.optional)

/** Collected via payment intake — not listed on the public document upload step */
export const WATER_RIGHT_PAYMENT_INTAKE_SLOTS: WaterRightDocumentSlotId[] = ['bankReceipt']

export const ALL_WATER_RIGHT_SLOT_IDS: WaterRightDocumentSlotId[] = [
  ...WATER_RIGHT_REQUIRED_DOCUMENTS.map((d) => d.id),
  ...WATER_RIGHT_PAYMENT_INTAKE_SLOTS,
]

export function emptyWaterRightDocumentFiles(): Record<WaterRightDocumentSlotId, File[]> {
  const slots = {} as Record<WaterRightDocumentSlotId, File[]>
  for (const id of ALL_WATER_RIGHT_SLOT_IDS) slots[id] = []
  return slots
}

export function emptyWaterRightDocumentMeta(): Record<
  WaterRightDocumentSlotId,
  import('@/lib/types').WaterRightDocumentMeta[]
> {
  const slots = {} as Record<WaterRightDocumentSlotId, import('@/lib/types').WaterRightDocumentMeta[]>
  for (const id of ALL_WATER_RIGHT_SLOT_IDS) slots[id] = []
  return slots
}
