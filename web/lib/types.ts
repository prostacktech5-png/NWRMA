import type { DocumentSlotId } from '@/lib/borehole-licensing-documents'
import type { WaterDrillingLicenceFormPayload } from '@/lib/nwrma-site/online-forms/water-drilling-licence-schema'
import type { DamSafetyFormPayload } from '@/lib/nwrma-site/online-forms/dam-safety-schema'
import type { EffluentDischargeFormPayload } from '@/lib/nwrma-site/online-forms/effluent-discharge-schema'
import type { WaterRightFormPayload } from '@/lib/nwrma-site/online-forms/water-right-schema'
import type { DamSafetyDocumentSlotId } from '@/lib/dam-safety-documents'
import type { EffluentDischargeDocumentSlotId } from '@/lib/effluent-discharge-documents'
import type { WaterRightDocumentSlotId } from '@/lib/water-right-documents'

// User & Auth Types
export type Role = 'admin' | 'dg' | 'hod' | 'staff'
export type Department =
  | 'hydrological'
  | 'boreholes'
  | 'financial'
  | 'hr'
  | 'compliance'
  | null

export interface User {
  id: string
  email: string
  name: string
  role: Role
  department: Department
  status: 'active' | 'disabled'
  createdAt: Date
  /**
   * Hydrological department staff only: fine-grained `/hydrological/*` access.
   * `null`/`undefined` = legacy accounts (full module access). HoD/admin ignore this.
   */
  hydroNavAccess?: HydroNavAccess | null
  /** Staff: which ERP sections they may access per department (sidebar enforcement). */
  departmentSectionAccess?: DepartmentSectionAccess | null
  /** True when invited but has not completed set-password yet. */
  pendingPasswordSetup?: boolean
  /** True when pending invite link has passed inviteExpiresAt. */
  inviteExpired?: boolean
}

/** Keys aligned with Hydrological sidebar / hub links. */
export type HydroNavAccessKey =
  | 'readings'
  | 'monitoring'
  | 'budget'
  | 'departmental_report'
  | 'lab_queue'

export type HydroNavAccess = Partial<Record<HydroNavAccessKey, boolean>>

/** Section id → allowed (e.g. hydrological:readings). */
export type DepartmentSectionFlags = Partial<Record<string, boolean>>

/** ERP department → section flags for staff nav enforcement. */
export type DepartmentSectionAccess = Partial<
  Record<Exclude<Department, null>, DepartmentSectionFlags>
>

// Budget & Finance Types
export interface FiscalYear {
  id: string
  label: string
  start: Date
  end: Date
  isActive: boolean
}

export interface ProgrammeBudgetLine {
  id: string
  fiscalYearId: string
  department: Department
  programmeCode: string
  programmeName: string
  allocatedAmount: number
  utilizedAmount: number
  currency: string
}

// Requisition Types
export type RequisitionStatus = 
  | 'draft' 
  | 'submitted' 
  | 'hod_review' 
  | 'dg_review' 
  | 'finance_review' 
  | 'approved' 
  | 'rejected' 
  | 'paid'

export interface Requisition {
  id: string
  department: Department
  requesterId: string
  requesterName: string
  hodUserId: string | null
  amount: number
  currency: string
  narrative: string
  programmeBudgetLineId: string | null
  status: RequisitionStatus
  financeNotes: string | null
  dgNotes: string | null
  createdAt: Date
  updatedAt: Date
}

export interface RequisitionEvent {
  id: string
  requisitionId: string
  fromStatus: RequisitionStatus
  toStatus: RequisitionStatus
  byUserId: string
  byUserName: string
  comment: string
  createdAt: Date
}

// Hydrological Types
export interface MonitoringStation {
  id: string
  name: string
  code: string
  lat: number | null
  lng: number | null
  district: string
  notes: string
  status: 'active' | 'inactive'
  /**
   * Flood-watch / action stage reference (m) for this gauge.
   * Current level % of threshold drives Low / Medium / High bands (monitoring dashboard).
   */
  alertThresholdM: number
}

export type HodReadingValidation = 'pending' | 'valid' | 'rejected'

export interface WaterLevelReading {
  id: string
  stationId: string
  stationName: string
  /** Officer who took / submitted the reading */
  officerName: string
  phoneNumber: string
  /** Links payroll / incentive rows to this officer */
  gaugeOfficerId: string
  /** HoD validation — drives accrual into monthly OfficerPayment while status is pending */
  hodValidation: HodReadingValidation
  /** Human-readable site / locality description */
  location: string
  measuredAt: Date
  levelM: number
  /** GPS coordinates as captured at reading (free text or decimal degrees) */
  gpsLocation: string
  /** Optional gauge photograph URL or stored path */
  gaugePhotoUrl?: string | null
  qualityFlag: 'good' | 'suspect' | 'poor' | null
  source: 'manual' | 'import' | 'field_app'
  createdBy: string
  createdAt: Date
}

/** Field / gauge officer — readings map here for payroll rows */
export interface GaugeOfficer {
  id: string
  fullName: string
  phone: string
  /** ERP user id when the officer is also staff (optional) */
  linkedUserId: string | null
  /** Mobile app auth — send as X-Field-App-Key (must match HydrologicalSettings.fieldAppKey for generic key, or officer-specific in future) */
  fieldAppKey: string
}

export type OfficerPaymentStatus =
  | 'pending'
  | 'submitted'
  | 'approved'
  | 'disbursed'

export interface OfficerPayment {
  id: string
  gaugeOfficerId: string
  officerName: string
  yearMonth: string
  validSubmissions: number
  rateSle: number
  totalSle: number
  status: OfficerPaymentStatus
  submittedAt: Date | null
  approvedAt: Date | null
  disbursedAt: Date | null
  approvedByUserId: string | null
  disbursedByUserId: string | null
}

export interface HydrologicalSettings {
  perReadingRateSle: number
  /** Shared demo key — production would issue per-officer keys */
  fieldAppKey: string
}

export interface HydroPaymentAuditEvent {
  id: string
  paymentId: string
  action: 'approve' | 'disburse'
  at: Date
  byUserId: string
}

/** Hydrological flood / high-water incident register (departmental reporting) */
export interface FloodIncident {
  id: string
  reportedAt: Date
  district: string
  riverOrArea: string
  severity: 'watch' | 'warning' | 'severe'
  status: 'open' | 'monitoring' | 'closed'
  summary: string
}

// Borehole Types
export interface DrillingCompany {
  id: string
  name: string
  registrationNo: string
  contacts: {
    phone: string
    email: string
    address: string
  }
  status: 'active' | 'suspended' | 'revoked'
  licenseExpiry: Date
}

export type BoreholeRegistryStatus = 'pending' | 'approved' | 'rejected' | 'suspended'

export type Survey123IntakeStatus = 'received' | 'registered' | 'rejected'

export interface Survey123BoreholeIntakeFields {
  drillingCompanyName: string | null
  locationDescription: string | null
  lat: number | null
  lng: number | null
  drillingMethod: string | null
  boreholeDepthM: number | null
  overburdenDepthM: number | null
  waterStrikeDepthsM: number[] | null
  permanentCasingType: string | null
  yieldLps: number | null
  transmissivity: number | null
  hydraulicConductivity: number | null
  waterQualityPhysical: Record<string, unknown> | null
  regionName: string | null
  districtName: string | null
  chiefdomName: string | null
  settlementType: string | null
}

export interface Survey123BoreholeIntake extends Survey123BoreholeIntakeFields {
  id: string
  status: Survey123IntakeStatus
  source: string
  regionId: string | null
  districtId: string | null
  chiefdomId: string | null
  settlementTypeId: string | null
  drillingCompanyId: string | null
  matchedCompanyName: string | null
  regionLabel: string | null
  districtLabel: string | null
  chiefdomLabel: string | null
  settlementLabel: string | null
  chiefdomCode: string | null
  regionCode: string | null
  districtCode: string | null
  settlementCode: string | null
  idPreview: string | null
  mappingComplete: boolean
  registeredBoreholeId: string | null
  registeredBoreholeCode: string | null
  rejectionReason: string | null
  reviewedAt: Date | null
  receivedAt: Date
  createdAt: Date
}

export type Survey123IntakeSummary = Pick<
  Survey123BoreholeIntake,
  | 'id'
  | 'status'
  | 'drillingCompanyName'
  | 'matchedCompanyName'
  | 'drillingCompanyId'
  | 'districtLabel'
  | 'chiefdomLabel'
  | 'regionLabel'
  | 'settlementLabel'
  | 'locationDescription'
  | 'receivedAt'
  | 'mappingComplete'
  | 'idPreview'
>

export interface Borehole {
  id: string
  code: string
  boreholeId?: string
  district: string
  region: string
  chiefdom?: string
  settlementType?: string
  lat: number | null
  lng: number | null
  depthM: number | null
  purpose: string
  ownerName: string
  drillingCompanyId: string | null
  drillingCompanyName: string | null
  survey123IntakeId?: string | null
  drillingMethod?: string | null
  overburdenDepthM?: number | null
  waterStrikeDepthsM?: number[] | null
  permanentCasingType?: string | null
  yieldLps?: number | null
  transmissivity?: number | null
  hydraulicConductivity?: number | null
  waterQualityPhysical?: Record<string, unknown> | null
  locationDescription?: string | null
  registryStatus: BoreholeRegistryStatus
  createdAt: Date
}

// Water Quality Types
export type LabRequestStatus =
  | 'received'
  | 'in_progress'
  | 'assigned'
  | 'testing'
  | 'review'
  | 'completed'
  | 'released'

export type LabRequestPriority = 'normal' | 'urgent' | 'critical'

export interface LabRequest {
  id: string
  reference: string
  publicCaseId: string | null
  requesterName: string
  requesterEmail: string
  requesterPhone?: string | null
  organisation: string
  siteAddress: string
  testsRequested: string[]
  priority: LabRequestPriority
  status: LabRequestStatus
  assignedToUserId: string | null
  assignedToName: string | null
  sampleCollectionScheduledAt?: Date | null
  reportNotes?: string | null
  notes?: string | null
  receivedAt: Date
  completedAt: Date | null
  results: Record<string, unknown> | null
}

// HR Types
export interface Employee {
  id: string
  userId: string | null
  fullName: string
  title: string
  department: Department
  phone: string
  email: string
  hiredAt: Date
  status: 'active' | 'on_leave' | 'terminated'
}

export type LeaveType = 'annual' | 'sick' | 'maternity' | 'paternity' | 'compassionate' | 'unpaid'
/** HR HoD gate first (`hod_review`), then DG (`dg_review`). Legacy DB value `pending` is read as `hod_review`. */
export type LeaveStatus = 'hod_review' | 'dg_review' | 'approved' | 'rejected' | 'cancelled'

export interface LeaveRequest {
  id: string
  employeeId: string
  employeeName: string
  start: Date
  end: Date
  type: LeaveType
  status: LeaveStatus
  approverId: string | null
  approverName: string | null
  comment: string
  createdAt: Date
}

export interface Asset {
  id: string
  tag: string
  name: string
  category: string
  custodianEmployeeId: string | null
  custodianName: string | null
  location: string
  acquiredAt: Date
  cost: number | null
  status: 'in_use' | 'in_storage' | 'maintenance' | 'disposed'
}

// Public Application Types
export type BankReceiptValidationStatus = 'pending' | 'validated' | 'rejected'

export type BankReceiptValidation = {
  status: BankReceiptValidationStatus
  /** Official finance receipt number (RCP-YYYY-####), issued when status is validated. */
  receiptNumber?: string | null
  validatedAt?: Date | null
  validatedBy?: string | null
  validatedByName?: string | null
  note?: string | null
}

export type OnlineFormPaymentIntakeAcknowledgements = {
  readInstructions: boolean
  feesUnderstood: boolean
  adminFeeTier?: 'provincial' | 'western_makeni_bo'
}

export type OnlineFormPaymentIntakeReceiptFile = {
  id: string
  name: string
  size: number
  mimeType?: string
  storageKey?: string
}

/** Persisted when applicant uploads a bank receipt before continuing the public wizard. */
export interface OnlineFormPaymentIntake {
  id: string
  intakeReference: string
  formSlug: string
  formTitle: string
  organisationName: string
  email: string
  phone: string
  contactPersonName: string
  acknowledgements: OnlineFormPaymentIntakeAcknowledgements
  receiptFile: OnlineFormPaymentIntakeReceiptFile
  bankReceiptValidation: BankReceiptValidation
  resumeTokenHash?: string | null
  resumeTokenExpiresAt?: Date | null
  /** Set when the one-time email resume link is first opened. */
  resumeTokenRedeemedAt?: Date | null
  linkedApplicationId?: string | null
  createdAt: Date
}

export type LicenseApplicationStatus = 
  | 'draft'
  | 'submitted' 
  | 'under_review'
  | 'field_inspection'
  | 'pending_payment'
  | 'additional_info_required' 
  | 'approved' 
  | 'rejected'
  | 'suspended'
  | 'expired'
  | 'revoked'

export type LicenseApplicationDocumentMeta = {
  id: string
  name: string
  size: number
  mimeType?: string
  /** Relative path under borehole-license-files root; omitted for demo seed rows */
  storageKey?: string
}

export type LicenseApplicationDocumentSlots = Record<
  DocumentSlotId,
  LicenseApplicationDocumentMeta[]
>

export interface BoreholeLicenseApplication {
  id: string
  reference: string
  status: LicenseApplicationStatus
  applicantName: string
  applicantEmail: string
  organisationName: string
  submittedAt: Date
  companyName: string
  regNumber: string
  email: string
  phone: string
  address: string
  contactName: string
  contactRole: string
  contactEmail: string
  contactPhone: string
  district: string
  rigCount: string
  equipmentDescription: string
  leadHydrogeologist: string
  qualifiedDrillersCount: string
  documents: LicenseApplicationDocumentSlots
  formType?: 'water-drilling-licence-v1'
  extendedForm?: WaterDrillingLicenceFormPayload
  reviewNote?: string | null
  reviewedAt?: Date | null
  siteInspectionDate?: string | null
  siteInspectionNotes?: string | null
  technicalReportSummary?: string | null
  lastEmailSentAt?: Date | null
  /** One-time link for applicant to refill missing fields after additional_info_required. */
  amendmentTokenHash?: string | null
  amendmentTokenExpiresAt?: Date | null
  amendmentClearPaths?: string[] | null
  /** Set when approved — links to `DrillingCompany.id` in ERP registry */
  licensedCompanyId?: string | null
  paymentStatus?: string
  approvedAt?: Date | null
  licenseExpiry?: Date | null
  bankReceiptValidation?: BankReceiptValidation
}

export type DamSafetyApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'additional_info_required'

export type DamSafetyDocumentMeta = {
  id: string
  name: string
  size: number
  mimeType?: string
  storageKey?: string
}

export type DamSafetyDocumentSlots = Record<DamSafetyDocumentSlotId, DamSafetyDocumentMeta[]>

export interface DamSafetyApplication {
  id: string
  reference: string
  status: DamSafetyApplicationStatus
  applicantName: string
  applicantEmail: string
  organisationName: string
  submittedAt: Date
  companyName: string
  contactPhone: string
  email: string
  mailingAddress: string
  district: string
  documents: DamSafetyDocumentSlots
  formType: 'dam-safety-v1'
  extendedForm: DamSafetyFormPayload
  reviewNote?: string | null
  reviewedAt?: Date | null
  lastEmailSentAt?: Date | null
  amendmentTokenHash?: string | null
  amendmentTokenExpiresAt?: Date | null
  amendmentClearPaths?: string[] | null
  bankReceiptValidation?: BankReceiptValidation
}

export type EffluentDischargeApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'additional_info_required'

export type EffluentDischargeDocumentMeta = {
  id: string
  name: string
  size: number
  mimeType?: string
  storageKey?: string
}

export type EffluentDischargeDocumentSlots = Record<
  EffluentDischargeDocumentSlotId,
  EffluentDischargeDocumentMeta[]
>

export interface EffluentDischargeApplication {
  id: string
  reference: string
  status: EffluentDischargeApplicationStatus
  applicantName: string
  applicantEmail: string
  organisationName: string
  submittedAt: Date
  companyName: string
  contactPhone: string
  email: string
  mailingAddress: string
  district: string
  documents: EffluentDischargeDocumentSlots
  formType: 'effluent-discharge-v1'
  extendedForm: EffluentDischargeFormPayload
  reviewNote?: string | null
  reviewedAt?: Date | null
  lastEmailSentAt?: Date | null
  amendmentTokenHash?: string | null
  amendmentTokenExpiresAt?: Date | null
  amendmentClearPaths?: string[] | null
  bankReceiptValidation?: BankReceiptValidation
}

export type WaterRightApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'additional_info_required'

export type WaterRightDocumentMeta = {
  id: string
  name: string
  size: number
  mimeType?: string
  storageKey?: string
}

export type WaterRightDocumentSlots = Record<
  WaterRightDocumentSlotId,
  WaterRightDocumentMeta[]
>

export interface WaterRightApplication {
  id: string
  reference: string
  status: WaterRightApplicationStatus
  applicantName: string
  applicantEmail: string
  organisationName: string
  submittedAt: Date
  companyName: string
  contactPhone: string
  email: string
  mailingAddress: string
  district: string
  documents: WaterRightDocumentSlots
  formType: 'water-right-v1'
  extendedForm: WaterRightFormPayload
  reviewNote?: string | null
  reviewedAt?: Date | null
  lastEmailSentAt?: Date | null
  amendmentTokenHash?: string | null
  amendmentTokenExpiresAt?: Date | null
  amendmentClearPaths?: string[] | null
  bankReceiptValidation?: BankReceiptValidation
}

export type WQPublicCaseStatus = 
  | 'intake_submitted' 
  | 'payment_pending' 
  | 'payment_received' 
  | 'sample_scheduled' 
  | 'testing' 
  | 'completed'

export interface WaterQualityPublicCase {
  id: string
  reference: string
  status: WQPublicCaseStatus
  applicantName: string
  applicantEmail: string
  siteAddress: string
  testsRequested: string[]
  paymentStatus: 'pending' | 'paid' | 'waived'
  paymentRef: string | null
  createdAt: Date
}

// Audit Types
export interface AuditLog {
  id: string
  actorUserId: string | null
  actorName: string | null
  action: string
  entityType: string
  entityId: string
  metadata: Record<string, unknown>
  ip: string | null
  createdAt: Date
}

// Notification Types
export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  link: string | null
  createdAt: Date
  /**
   * Department inbox: HoDs and staff in this department see it (DG/admin see all).
   * When omitted, the notification is only for `userId` (and org-wide roles).
   */
  scopeDepartment?: Department
}

// Dashboard Stats
export interface DashboardStats {
  totalRequisitions: number
  pendingApprovals: number
  budgetUtilization: number
  activeStations: number
  activeBoreholes: number
  pendingLabRequests: number
  totalEmployees: number
}
