import type { ZodError, ZodIssue, ZodSchema } from 'zod'

const FIELD_LABELS: Record<string, string> = {
  companyName: 'Company name',
  poBox: 'P.O. Box',
  address: 'Address',
  phone: 'Telephone',
  fax: 'Fax',
  email: 'Email',
  contactName: 'Contact person name',
  contactEmail: 'Contact email',
  contactPhone: 'Contact phone',
  regNumber: 'Registered company number',
  bankers: 'Bankers name and address',
  district: 'Primary operating district',
  licenceCategoryRequested: 'Licence category',
  projectsLast5Years: 'Projects in the last 5 years',
  ceoDirectorName: 'Name of CEO/Director',
  contactPersonName: 'Contact person name',
  mailingAddress: 'Mailing address',
  officePhone: 'Telephone (office)',
  mobilePhone: 'Mobile phone',
  town: 'Town',
  region: 'Region',
  purposes: 'Purpose of water use',
  effluentGeneratedTypes: 'Type of effluent generated',
  usePointTown: 'Point of water use — Town',
  usePointDistrict: 'Point of water use — District',
  usePointRegion: 'Point of water use — Region',
  usePointGps: 'GPS coordinates',
  activityStatus: 'Current status of activity',
  waterSourceType: 'Type of water source',
  damLocationTown: 'Dam location — Town',
  damLocationDistrict: 'Dam location — District',
  damLocationRegion: 'Dam location — Region',
  damGpsCoordinates: 'Dam GPS coordinates',
  damStatus: 'Dam status',
  damClass: 'Dam class',
  damMaterial: 'Dam material',
  damFunction: 'Dam function',
  damClassAppliedFor: 'Dam class applied for',
  projectDescription: 'Project description',
  environmentalImpacts: 'Major environmental impacts',
  pollutionMitigationMeasures: 'Pollution mitigation measures',
  declarationSignature: 'Declaration signature',
  declarationPrintName: 'Declaration print name',
  declarationDate: 'Declaration date',
  ownershipType: 'Ownership type',
}

/** Map effluent discharge schema field paths to wizard step index (see STEPS in effluent-discharge-form). */
export function effluentDischargePathToStep(path: (string | number)[]): number {
  const root = String(path[0] ?? '')
  if (root === 'acknowledgements') return 0
  if (
    [
      'companyName',
      'ceoDirectorName',
      'contactPersonName',
      'mailingAddress',
      'officePhone',
      'mobilePhone',
      'fax',
      'email',
      'website',
      'permitType',
      'renewalPermitId',
      'ownershipType',
      'ownershipOther',
      'partnersDetails',
    ].includes(root)
  ) {
    return 1
  }
  if (
    ['town', 'district', 'region', 'waterUseCategory', 'purposes', 'purposesOther'].includes(root)
  ) {
    return 2
  }
  if (['effluentGeneratedTypes', 'effluentGeneratedTypesOther'].includes(root)) {
    return 3
  }
  if (root === 'includedDocuments' || root === 'includedDocumentsReasons') return 4
  if (
    [
      'usePointTown',
      'usePointDistrict',
      'usePointRegion',
      'usePointGps',
      'activityStatus',
      'activityCommencementDate',
      'waterSourceType',
      'waterSourceName',
      'tributaryOf',
      'groundwaterBoreholes',
      'rateOfUseAnnual',
      'rateOfUseDaily',
      'rateOfUseSeasonal',
      'consumptionDeterminationMethod',
    ].includes(root)
  ) {
    return 5
  }
  if (
    [
      'dischargeTown',
      'dischargeDistrict',
      'dischargeRegion',
      'dischargeGps',
      'returnFlowQuantity',
      'receivingWaterBodyType',
      'receivingWaterBodyName',
      'returnFlowQuality',
      'waterQualityAssessmentMethod',
      'waterQualityTestingInstitutions',
      'projectedUseFrom',
      'projectedUseTo',
      'projectDescription',
      'acquisitionDate',
      'beneficiaries',
      'otherMajorUsers',
    ].includes(root)
  ) {
    return 6
  }
  if (
    [
      'affectedPartiesList',
      'affectedByUseUpstream',
      'affectedByUseDownstream',
      'affectedByDischargeDownstream',
      'environmentalImpacts',
      'pollutionMitigationMeasures',
      'abstractionPumpDetails',
    ].includes(root)
  ) {
    return 7
  }
  if (root === 'activitySections') return 8
  if (
    ['declarationSignature', 'declarationPrintName', 'declarationDate'].includes(root)
  ) {
    return 10
  }
  return 11
}

/** Water right & dam safety share the same wizard step layout. */
export function permitApplicationPathToStep(path: (string | number)[]): number {
  const root = String(path[0] ?? '')
  if (root === 'acknowledgements') return 0
  if (
    [
      'companyName',
      'ceoDirectorName',
      'contactPersonName',
      'mailingAddress',
      'officePhone',
      'mobilePhone',
      'fax',
      'email',
      'website',
      'permitType',
      'licenceType',
      'renewalPermitId',
      'renewalLicenceId',
      'ownershipType',
      'ownershipOther',
      'partnersDetails',
    ].includes(root)
  ) {
    return 1
  }
  if (
    ['town', 'district', 'region', 'waterUseCategory', 'purposes', 'purposesOther'].includes(root)
  ) {
    return 2
  }
  if (root === 'includedDocuments' || root === 'includedDocumentsReasons') return 3
  if (
    [
      'usePointTown',
      'usePointDistrict',
      'usePointRegion',
      'usePointGps',
      'damLocationTown',
      'damLocationDistrict',
      'damLocationRegion',
      'damGpsCoordinates',
      'damStatus',
      'activityCommencementDate',
      'waterSourceType',
      'waterSourceName',
      'tributaryOf',
      'storageTypes',
      'communitiesUpstream',
      'communitiesDownstream',
      'waterUsersUpstream',
      'waterUsersDownstream',
      'damClass',
      'damMaterial',
      'damFunction',
      'damTypes',
      'damClassAppliedFor',
      'actualCapacity',
      'rateOfUseDaily',
      'rateOfUseSeasonal',
      'consumptionDeterminationMethod',
    ].includes(root)
  ) {
    return 4
  }
  if (
    [
      'dischargeTown',
      'dischargeDistrict',
      'dischargeRegion',
      'dischargeGps',
      'returnFlowQuantity',
      'receivingWaterBodyType',
      'receivingWaterBodyName',
      'returnFlowQuality',
      'waterQualityAssessmentMethod',
      'waterQualityTestingInstitutions',
      'projectedUseFrom',
      'projectedUseTo',
      'projectDescription',
      'acquisitionDate',
      'beneficiaries',
      'otherMajorUsers',
    ].includes(root)
  ) {
    return 5
  }
  if (
    [
      'affectedPartiesList',
      'affectedByUseUpstream',
      'affectedByUseDownstream',
      'affectedByDischargeDownstream',
      'environmentalImpacts',
      'pollutionMitigationMeasures',
      'abstractionPumpDetails',
    ].includes(root)
  ) {
    return 6
  }
  if (root === 'activitySections') return 7
  if (
    ['declarationSignature', 'declarationPrintName', 'declarationDate'].includes(root)
  ) {
    return 9
  }
  return 10
}

export function waterDrillingPathToStep(path: (string | number)[]): number {
  const root = String(path[0] ?? '')
  if (root === 'acknowledgements') return 0
  if (
    [
      'companyName',
      'poBox',
      'address',
      'phone',
      'fax',
      'email',
      'contactName',
      'contactEmail',
      'contactPhone',
      'district',
      'licenceCategoryRequested',
    ].includes(root)
  ) {
    return 1
  }
  if (root === 'regNumber' || root === 'bankers' || root === 'directors') return 2
  if (
    root === 'boreholeClassA' ||
    root === 'boreholeClassB' ||
    root === 'boreholeClassC' ||
    root === 'handDugWell'
  ) {
    return 3
  }
  if (
    root === 'boreholePersonnel' ||
    root === 'handDugPersonnel' ||
    root === 'projectsLast5Years' ||
    root === 'referee1' ||
    root === 'referee2'
  ) {
    return 4
  }
  if (
    ['declarationSignature', 'declarationDate'].includes(root)
  ) {
    return 6
  }
  return 7
}

function labelForPath(path: (string | number)[]): string {
  const root = String(path[0] ?? '')
  if (FIELD_LABELS[root]) return FIELD_LABELS[root]
  if (root === 'referee1' || root === 'referee2') {
    const sub = String(path[1] ?? '')
    const which = root === 'referee1' ? 'Referee 1' : 'Referee 2'
    if (sub === 'name') return `${which} — name`
    if (sub === 'address') return `${which} — address`
    return which
  }
  if (root === 'directors') {
    return 'Director details'
  }
  if (root === 'acknowledgements') {
    return 'Instructions and fee confirmation'
  }
  return root.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
}

export function zodIssueToMessage(issue: ZodIssue): string {
  const label = labelForPath(issue.path)
  const emailField = issue.path[0] === 'email' || issue.path[0] === 'contactEmail'
  if (issue.code === 'invalid_type' && issue.received === 'undefined') {
    return `${label} is required.`
  }
  if (issue.code === 'too_small' && issue.type === 'string') {
    return `${label} is required.`
  }
  if (issue.code === 'too_small' && issue.type === 'array') {
    return `${label}: select at least one option.`
  }
  if (emailField && issue.code === 'invalid_string') {
    return 'Enter a valid email address.'
  }
  if (issue.path[0] === 'acknowledgements') {
    return issue.message
  }
  return issue.message || `${label} is invalid.`
}

export function firstZodErrorMessage(error: ZodError): string {
  const issue = error.issues[0]
  return issue ? zodIssueToMessage(issue) : 'Please check the form for missing or invalid fields.'
}

export type ApiValidationBody = {
  error?: string
  details?: {
    fieldErrors?: Record<string, string[]>
    formErrors?: string[]
  }
}

export function apiValidationErrorMessage(data: ApiValidationBody): string {
  const formErr = data.details?.formErrors?.[0]
  if (formErr) return formErr
  const fieldEntries = Object.entries(data.details?.fieldErrors ?? {})
  if (fieldEntries.length > 0) {
    const [field, messages] = fieldEntries[0]
    const label = FIELD_LABELS[field] ?? field
    return `${label}: ${messages[0] ?? 'invalid'}`
  }
  return data.error ?? 'Submission failed.'
}

/** Run per-step checks, then full Zod schema, before multipart submit. */
export function validateAllStepsBeforeSubmit(opts: {
  maxStepInclusive: number
  validateStep: (index: number) => string | null
  schema: ZodSchema
  form: unknown
  pathToStep: (path: (string | number)[]) => number
}): { message: string; step: number } | null {
  const { maxStepInclusive, validateStep, schema, form, pathToStep } = opts
  for (let i = 0; i <= maxStepInclusive; i++) {
    const stepErr = validateStep(i)
    if (stepErr) return { message: stepErr, step: i }
  }
  const parsed = schema.safeParse(form)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return {
      message: firstZodErrorMessage(parsed.error),
      step: issue ? pathToStep(issue.path) : maxStepInclusive + 1,
    }
  }
  return null
}
