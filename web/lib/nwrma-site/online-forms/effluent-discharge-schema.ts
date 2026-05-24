import { z } from 'zod'

export {
  WATER_USE_PURPOSES,
  ACTIVITY_SECTION_KEYS,
  ACTIVITY_SECTION_LABELS,
} from '@/lib/nwrma-site/online-forms/dam-safety-schema'

import { ACTIVITY_SECTION_KEYS } from '@/lib/nwrma-site/online-forms/dam-safety-schema'

export const EFFLUENT_GENERATED_TYPES = [
  'Wood processing',
  'Mining operations',
  'Navigation',
  'Domestic/municipal',
  'Industrial waste — Fruit processing',
  'Industrial waste — Beverage processing',
  'Industrial waste — Production of confectionery',
  'Large-Scale Agriculture — Palm oil processing',
  'Large-Scale Agriculture — Pineapple processing',
] as const

const yesNoSchema = z.object({
  included: z.enum(['yes', 'no', 'na']),
  reasonIfNo: z.string().optional().default(''),
})

export const effluentDischargeFormSchema = z.object({
  acknowledgements: z
    .object({
      readInstructions: z.boolean(),
      feesUnderstood: z.boolean(),
    })
    .refine((a) => a.readInstructions && a.feesUnderstood, {
      message: 'You must confirm you have read the instructions and fee information.',
    }),
  companyName: z.string().min(1),
  ceoDirectorName: z.string().min(1),
  contactPersonName: z.string().min(1),
  mailingAddress: z.string().min(1),
  officePhone: z.string().min(1),
  mobilePhone: z.string().min(1),
  fax: z.string().optional().default(''),
  email: z.string().email(),
  website: z.string().optional().default(''),
  permitType: z.enum(['new', 'renewal']),
  renewalPermitId: z.string().optional().default(''),
  ownershipType: z.string().min(1),
  ownershipOther: z.string().optional().default(''),
  partnersDetails: z.string().optional().default(''),
  town: z.string().min(1),
  district: z.string().min(1),
  region: z.string().min(1),
  waterUseCategory: z.enum(['consumptive', 'non-consumptive']),
  purposes: z.array(z.string()).min(1),
  purposesOther: z.string().optional().default(''),
  effluentGeneratedTypes: z.array(z.string()).min(1),
  effluentGeneratedTypesOther: z.string().optional().default(''),
  includedDocuments: z.object({
    eiaReport: yesNoSchema,
    environmentalPermit: yesNoSchema,
    otherMdaPermits: yesNoSchema,
    sitePlan: yesNoSchema,
    wdmp: yesNoSchema,
    businessCertificates: yesNoSchema,
  }),
  includedDocumentsReasons: z.string().optional().default(''),
  usePointTown: z.string().min(1),
  usePointDistrict: z.string().min(1),
  usePointRegion: z.string().min(1),
  usePointGps: z.string().min(1),
  activityStatus: z.string().min(1),
  activityCommencementDate: z.string().optional().default(''),
  waterSourceType: z.string().min(1),
  waterSourceName: z.string().optional().default(''),
  tributaryOf: z.string().optional().default(''),
  groundwaterBoreholes: z.string().optional().default(''),
  rateOfUseAnnual: z.string().optional().default(''),
  rateOfUseDaily: z.string().optional().default(''),
  rateOfUseSeasonal: z.string().optional().default(''),
  consumptionDeterminationMethod: z.string().optional().default(''),
  dischargeTown: z.string().optional().default(''),
  dischargeDistrict: z.string().optional().default(''),
  dischargeRegion: z.string().optional().default(''),
  dischargeGps: z.string().optional().default(''),
  returnFlowQuantity: z.string().optional().default(''),
  receivingWaterBodyType: z.string().optional().default(''),
  receivingWaterBodyName: z.string().optional().default(''),
  returnFlowQuality: z.string().optional().default(''),
  waterQualityAssessmentMethod: z.string().optional().default(''),
  waterQualityTestingInstitutions: z.string().optional().default(''),
  projectedUseFrom: z.string().optional().default(''),
  projectedUseTo: z.string().optional().default(''),
  projectDescription: z.string().min(1),
  acquisitionDate: z.string().optional().default(''),
  beneficiaries: z.string().optional().default(''),
  otherMajorUsers: z.string().optional().default(''),
  affectedPartiesList: z.string().optional().default(''),
  affectedByUseUpstream: z.string().optional().default(''),
  affectedByUseDownstream: z.string().optional().default(''),
  affectedByDischargeDownstream: z.string().optional().default(''),
  environmentalImpacts: z.string().min(1),
  pollutionMitigationMeasures: z.string().min(1),
  abstractionPumpDetails: z.string().optional().default(''),
  activitySections: z.record(z.string(), z.string()),
  declarationSignature: z.string().min(1),
  declarationPrintName: z.string().min(1),
  declarationDate: z.string().optional().default(''),
}).superRefine((data, ctx) => {
  if (data.permitType === 'renewal' && !data.renewalPermitId.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Previous permit ID is required for renewal applications.',
      path: ['renewalPermitId'],
    })
  }
})

export type EffluentDischargeFormPayload = z.infer<typeof effluentDischargeFormSchema>

function defaultYesNo() {
  return { included: 'yes' as const, reasonIfNo: '' }
}

function defaultActivitySections(): Record<string, string> {
  const sections: Record<string, string> = {}
  for (const key of ACTIVITY_SECTION_KEYS) sections[key] = ''
  return sections
}

export function createDefaultEffluentDischargeForm(): EffluentDischargeFormPayload {
  return {
    acknowledgements: { readInstructions: false, feesUnderstood: false },
    companyName: '',
    ceoDirectorName: '',
    contactPersonName: '',
    mailingAddress: '',
    officePhone: '',
    mobilePhone: '',
    fax: '',
    email: '',
    website: '',
    permitType: 'new',
    renewalPermitId: '',
    ownershipType: 'Cooperation',
    ownershipOther: '',
    partnersDetails: '',
    town: '',
    district: '',
    region: '',
    waterUseCategory: 'consumptive',
    purposes: [],
    purposesOther: '',
    effluentGeneratedTypes: [],
    effluentGeneratedTypesOther: '',
    includedDocuments: {
      eiaReport: defaultYesNo(),
      environmentalPermit: defaultYesNo(),
      otherMdaPermits: defaultYesNo(),
      sitePlan: defaultYesNo(),
      wdmp: defaultYesNo(),
      businessCertificates: defaultYesNo(),
    },
    includedDocumentsReasons: '',
    usePointTown: '',
    usePointDistrict: '',
    usePointRegion: '',
    usePointGps: '',
    activityStatus: '',
    activityCommencementDate: '',
    waterSourceType: '',
    waterSourceName: '',
    tributaryOf: '',
    groundwaterBoreholes: '',
    rateOfUseAnnual: '',
    rateOfUseDaily: '',
    rateOfUseSeasonal: '',
    consumptionDeterminationMethod: '',
    dischargeTown: '',
    dischargeDistrict: '',
    dischargeRegion: '',
    dischargeGps: '',
    returnFlowQuantity: '',
    receivingWaterBodyType: '',
    receivingWaterBodyName: '',
    returnFlowQuality: '',
    waterQualityAssessmentMethod: '',
    waterQualityTestingInstitutions: '',
    projectedUseFrom: '',
    projectedUseTo: '',
    projectDescription: '',
    acquisitionDate: '',
    beneficiaries: '',
    otherMajorUsers: '',
    affectedPartiesList: '',
    affectedByUseUpstream: '',
    affectedByUseDownstream: '',
    affectedByDischargeDownstream: '',
    environmentalImpacts: '',
    pollutionMitigationMeasures: '',
    abstractionPumpDetails: '',
    activitySections: defaultActivitySections(),
    declarationSignature: '',
    declarationPrintName: '',
    declarationDate: '',
  }
}

export const FORM_INSTRUCTIONS = {
  intro: `Pursuant to the National Water Resources Management Agency Act No.5 of 2017, no person shall discharge, dam, store, dredge, or otherwise use water resources prior to obtaining a water right permit.`,
  completeness: `In order for NWRMA to process applications for the discharge of effluent conveniently, complete this form as fully as possible and include all relevant documents. Applications will not be processed unless all required information is included.`,
  attachmentsNote: `Where attached sheets and other technical documents are used in lieu of the space provided, indicate appropriate cross-references. Paragraphs that are not applicable should be marked as "N/A".`,
  processingTime: `On the precondition that the application has been completed correctly, the average length of time required to decide on permits is within 3 months from date of receipt, including if necessary, a public disclosure.`,
  involvement: `The applicant is required to be present during the site verification exercise. The applicant will be informed of objections raised during the hearing phase and requested to participate in public forums relating to the application.`,
} as const

export const ADMIN_FEES_TEXT = `Administrative fees of SLL 10,000.00 for provincial areas excluding Makeni and Bo Cities and SLL 1,000.00 for Western Area, Makeni and Bo Cities. Payable to National Water Resources Management Agency (SLL), Bank of Sierra Leone, Account 0111004067, BBAN 000001011100406701. Non-refundable. Applications processed ONLY AFTER fee is paid.`

export const WATER_USE_DEFINITIONS = [
  { term: 'Consumptive Use', def: 'Using any mechanical means to withdraw water from ponds, lakes, rivers, streams, or aquifers, etc.' },
  { term: 'Non-Consumptive Use', def: 'A water use that does not affect the quantity of freshwater (e.g. hydropower, boating).' },
  { term: 'Municipal Use', def: 'Freshwater for municipal potable water supply to a population of more than 2000.' },
  { term: 'Domestic Use', def: 'Freshwater for household use.' },
  { term: 'Wastewater', def: 'Water that has been used and contains pollutants requiring treatment before discharge.' },
  { term: 'Industrial', def: 'Freshwater for industrial purposes, e.g. food processing, textile making.' },
  { term: 'Dewatering', def: 'An intentional lowering of water level e.g. groundwater level.' },
  { term: 'Spillage (controlled)', def: 'Controlled release of freshwater and/or effluent into the water body.' },
] as const

export const NWRMA_CONTACT = {
  address: '29 King Harman Road, Freetown, Sierra Leone',
  phone: '+23275 597184 / +23230 775898',
  email: 'waterresourcesagency2018@gmail.com',
} as const
