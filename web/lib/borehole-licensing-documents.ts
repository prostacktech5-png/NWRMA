export type DocumentSlotId =
  | 'certificateOfIncorporation'
  | 'certificateToCommenceBusiness'
  | 'objectsOfCompany'
  | 'listOfDirectors'
  | 'certificateOfChangeOfName'
  | 'companyRepresentatives'
  | 'taxClearance'
  | 'vatCertificate'
  | 'slrsaProof'
  | 'equipmentSpecifications'
  | 'annex2PersonnelCvs'
  | 'annex3Projects'
  | 'annex4QuarterlyReports'
  | 'bankReceipt'
  | 'businessRegistration'
  | 'machineLifeCards'
  | 'personnelCvs'

export type RequiredDocument = {
  id: DocumentSlotId
  label: string
  description: string
  checklistHint: string
  optional?: boolean
}

export const REQUIRED_DOCUMENTS: RequiredDocument[] = [
  {
    id: 'certificateOfIncorporation',
    label: 'Certificate of incorporation',
    description: 'Business particulars (a)(i) — PDF, JPG, PNG',
    checklistHint: 'Certificate of incorporation',
  },
  {
    id: 'certificateToCommenceBusiness',
    label: 'Certificate to commence business',
    description: 'Business particulars (a)(ii)',
    checklistHint: 'Certificate to commence business',
  },
  {
    id: 'objectsOfCompany',
    label: 'Objects of the company',
    description: 'Business particulars (a)(iii)',
    checklistHint: 'Objects of the company',
  },
  {
    id: 'listOfDirectors',
    label: 'List of Directors',
    description: 'Business particulars (a)(iv)',
    checklistHint: 'List of Directors',
  },
  {
    id: 'certificateOfChangeOfName',
    label: 'Certificate of change of name',
    description: 'Where applicable (a)(v)',
    checklistHint: 'Certificate of change of name (if applicable)',
    optional: true,
  },
  {
    id: 'companyRepresentatives',
    label: "Company's representatives",
    description: 'Name of company representatives (a)(vi)',
    checklistHint: "Company's representatives",
  },
  {
    id: 'taxClearance',
    label: 'Tax clearance certificate',
    description: 'Requirement (b)',
    checklistHint: 'Tax clearance certificate',
  },
  {
    id: 'vatCertificate',
    label: 'Value Added Tax (VAT) Certificate',
    description: 'Requirement (c)',
    checklistHint: 'VAT Certificate',
  },
  {
    id: 'slrsaProof',
    label: 'SLRSA proof of ownership',
    description: 'Vehicles, drilling rigs and accessories (d)',
    checklistHint: 'Sierra Leone Road Safety Authority documentation',
  },
  {
    id: 'equipmentSpecifications',
    label: 'Equipment list and specifications (Annex 1)',
    description: 'Drilling equipment specifications (e)',
    checklistHint: 'List of drilling equipment and specifications',
  },
  {
    id: 'annex2PersonnelCvs',
    label: 'Annex 2 — Key personnel CVs',
    description: 'CVs of key personnel and referees',
    checklistHint: 'Key personnel CVs (Annex 2)',
  },
  {
    id: 'annex3Projects',
    label: 'Annex 3 — Projects (last 5 years)',
    description: 'List of projects carried out',
    checklistHint: 'Projects in the last 5 years (Annex 3)',
  },
  {
    id: 'annex4QuarterlyReports',
    label: 'Annex 4 — Quarterly reports',
    description: 'For renewal purposes only',
    checklistHint: 'Quarterly well drilling reports (renewal only)',
    optional: true,
  },
]

/** Collected via payment intake — not listed on the public document upload step */
export const PAYMENT_INTAKE_DOCUMENT_SLOTS: DocumentSlotId[] = ['bankReceipt']

export const LEGACY_DOCUMENT_SLOTS: DocumentSlotId[] = [
  'businessRegistration',
  'machineLifeCards',
  'personnelCvs',
]

export const ALL_DOCUMENT_SLOT_IDS: DocumentSlotId[] = [
  ...REQUIRED_DOCUMENTS.map((d) => d.id),
  ...PAYMENT_INTAKE_DOCUMENT_SLOTS,
  ...LEGACY_DOCUMENT_SLOTS,
]

export function emptyDocumentSlots(): Record<DocumentSlotId, File[]> {
  const slots = {} as Record<DocumentSlotId, File[]>
  for (const id of ALL_DOCUMENT_SLOT_IDS) {
    slots[id] = []
  }
  return slots
}

export function emptyDocumentMetaSlots(): Record<DocumentSlotId, import('@/lib/types').LicenseApplicationDocumentMeta[]> {
  const slots = {} as Record<DocumentSlotId, import('@/lib/types').LicenseApplicationDocumentMeta[]>
  for (const id of ALL_DOCUMENT_SLOT_IDS) {
    slots[id] = []
  }
  return slots
}

export const REQUIRED_DOCUMENT_SLOTS = REQUIRED_DOCUMENTS.filter((d) => !d.optional)

export const BEFORE_YOU_START_CHECKLIST = REQUIRED_DOCUMENT_SLOTS.map((doc) => doc.checklistHint)

/** @deprecated use emptyDocumentSlots */
export const EMPTY_DOCUMENTS = emptyDocumentSlots()
