import { z } from 'zod'

const requiredText = z.string().trim().min(1)
const emailText = z.string().trim().min(1).email()

export const LICENCE_CATEGORIES = ['A', 'B', 'C', 'foreign', 'handDug'] as const
export type LicenceCategory = (typeof LICENCE_CATEGORIES)[number]

export const equipmentRowSchema = z.object({
  description: z.string(),
  qtyExpected: z.string(),
  qtyAvailable: z.string(),
  equipmentClass: z.string().optional(),
})

export const personnelRowSchema = z.object({
  role: z.string(),
  qty: z.string(),
  qualification: z.string(),
  yearsExperience: z.string(),
})

export const directorRowSchema = z.object({
  fullName: z.string(),
  citizenship: z.string(),
})

export const refereeSchema = z.object({
  name: z.string(),
  address: z.string(),
})

export const waterDrillingLicenceFormSchema = z.object({
  acknowledgements: z
    .object({
      readInstructions: z.boolean(),
      feesUnderstood: z.boolean(),
    })
    .refine((a) => a.readInstructions && a.feesUnderstood, {
      message: 'You must confirm you have read the instructions and fee information.',
    }),
  companyName: requiredText,
  poBox: z.string().optional().default(''),
  address: requiredText,
  phone: requiredText,
  fax: z.string().optional().default(''),
  email: emailText,
  contactName: requiredText,
  contactEmail: emailText,
  contactPhone: requiredText,
  regNumber: requiredText,
  directors: z.array(directorRowSchema).min(1),
  bankers: requiredText,
  district: requiredText,
  licenceCategoryRequested: z.enum(LICENCE_CATEGORIES),
  boreholeClassA: z.array(equipmentRowSchema),
  boreholeClassB: z.array(equipmentRowSchema),
  boreholeClassC: z.array(equipmentRowSchema),
  handDugWell: z.array(equipmentRowSchema),
  boreholePersonnel: z.array(personnelRowSchema),
  handDugPersonnel: z.array(personnelRowSchema),
  projectsLast5Years: requiredText,
  referee1: refereeSchema,
  referee2: refereeSchema,
  declarationSignature: requiredText,
  declarationDate: z.string().optional().default(''),
})

export type WaterDrillingLicenceFormPayload = z.infer<typeof waterDrillingLicenceFormSchema>

export type EquipmentRow = z.infer<typeof equipmentRowSchema>
export type PersonnelRow = z.infer<typeof personnelRowSchema>

const BOREHOLE_EQUIPMENT_ROWS: EquipmentRow[] = [
  { description: 'Drill Rigs minimum depth 150m', qtyExpected: '2', qtyAvailable: '', equipmentClass: 'CLASS A' },
  { description: 'Compressor minimum 26 PSI', qtyExpected: '2', qtyAvailable: '' },
  { description: 'Well camera', qtyExpected: '1', qtyAvailable: '' },
  { description: 'Pumping test kit', qtyExpected: '4', qtyAvailable: '' },
  { description: 'Stock of assorted sizes of screens and caissons', qtyExpected: 'Item', qtyAvailable: '' },
  { description: 'Support truck', qtyExpected: '2', qtyAvailable: '' },
  { description: 'Qty of drilling hammer', qtyExpected: '3', qtyAvailable: '' },
  { description: 'Drilling stem', qtyExpected: '150', qtyAvailable: '' },
  { description: 'Drilling Rig minimum depth 100 meters', qtyExpected: '1', qtyAvailable: '' },
]

const HAND_DUG_EQUIPMENT_ROWS: EquipmentRow[] = [
  { description: 'Pumping test kit', qtyExpected: '1', qtyAvailable: '' },
  { description: 'Stock of assorted sizes of steel caissons', qtyExpected: 'Item', qtyAvailable: '' },
  { description: 'Support truck', qtyExpected: '1', qtyAvailable: '' },
  { description: 'Stock of well excavation materials', qtyExpected: '1', qtyAvailable: '' },
]

const BOREHOLE_PERSONNEL_ROWS: PersonnelRow[] = [
  { role: 'Geologist', qty: '2', qualification: '', yearsExperience: '5 Yrs' },
  { role: 'Master driller', qty: '3', qualification: '', yearsExperience: '5 Yrs' },
  { role: 'Engineer', qty: '1', qualification: '', yearsExperience: '4 Yrs' },
  { role: 'Pumping test technician', qty: '2', qualification: '', yearsExperience: '3 Yrs' },
  { role: 'Well drilling technicians', qty: '2', qualification: '', yearsExperience: '5 Yrs' },
]

const HAND_DUG_PERSONNEL_ROWS: PersonnelRow[] = [
  { role: 'Geologist', qty: '2', qualification: '', yearsExperience: '5 Yrs' },
  { role: 'Engineer', qty: '1', qualification: '', yearsExperience: '4 Yrs' },
  { role: 'Pumping test technician', qty: '2', qualification: '', yearsExperience: '3 Yrs' },
  { role: 'Well technicians', qty: '2', qualification: '', yearsExperience: '5 Yrs' },
]

export function createDefaultWaterDrillingForm(): WaterDrillingLicenceFormPayload {
  return {
    acknowledgements: { readInstructions: false, feesUnderstood: false },
    companyName: '',
    poBox: '',
    address: '',
    phone: '',
    fax: '',
    email: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    regNumber: '',
    directors: [{ fullName: '', citizenship: '' }],
    bankers: '',
    district: '',
    licenceCategoryRequested: 'B',
    boreholeClassA: BOREHOLE_EQUIPMENT_ROWS.map((r) => ({ ...r, equipmentClass: 'CLASS A' })),
    boreholeClassB: BOREHOLE_EQUIPMENT_ROWS.map((r) => ({ ...r, equipmentClass: 'CLASS B' })),
    boreholeClassC: BOREHOLE_EQUIPMENT_ROWS.map((r) => ({ ...r, equipmentClass: 'CLASS C' })),
    handDugWell: HAND_DUG_EQUIPMENT_ROWS.map((r) => ({ ...r })),
    boreholePersonnel: BOREHOLE_PERSONNEL_ROWS.map((r) => ({ ...r })),
    handDugPersonnel: HAND_DUG_PERSONNEL_ROWS.map((r) => ({ ...r })),
    projectsLast5Years: '',
    referee1: { name: '', address: '' },
    referee2: { name: '', address: '' },
    declarationSignature: '',
    declarationDate: '',
  }
}

/** Notes on later form pages (Annex / equipment sections), not the instruction preamble. */
export const FORM_INSTRUCTIONS = {
  cvNote: `All drilling companies from classes A to C, or companies involved in the construction of hand dug wells, must present the list of all their key staff together with their CVs and certificates BEFORE LICENCES ARE ISSUED.`,
  uniqueWellNumber: `A unique well number should be obtained for any well development. On no account should any well be drilled whether for private purposes or not without a unique numbering system.`,
} as const

export const FEE_SCHEDULE = [
  { category: 'A (Local)', description: 'Owns two or more functioning rigs, compressors, warehouse, personnel, and laboratory.', amount: 'NLe 25,000.00' },
  { category: 'B (Local)', description: 'Owns one functioning rig, compressors, warehouse, personnel, and equipment.', amount: 'NLe 15,000.00' },
  { category: 'C (Local)', description: 'Hired rig(s) from a non-NWRMA certified licence holder.', amount: 'NLe 15,000.00' },
  { category: 'Foreign', description: 'Two or more rigs, compressors, warehouse, personnel, and equipment.', amount: 'NLe 100,500.00' },
  { category: 'Hand Dug Well', description: 'Assorted well construction tools, steel, compressors, personnel, and equipment.', amount: 'NLe 10,000.00' },
] as const

export const ADMIN_FEES_TEXT = `Administrative fee of NLe 15,000 for provincial areas (other than Bo and Makeni cities) and SLE 1,000 for Western Area, Bo and Makeni cities. Licence fees: NLe 17,000 and NLe 25,000 for classes B and A respectively. Pay on submission with pay-in-slip. Account: National Water Resources Management Agency (SLE), Bank of Sierra Leone, Account 0111004067, BBAN 000001011100406701. Only certified cheques payable to NWRMA accepted.`

export const NWRMA_CONTACT = {
  address: '29 King Harman Road Brookfields, Freetown',
  phone: '+23275597184 / +23230 775898',
  email: 'waterresourcesagency2018@gmail.com',
} as const
