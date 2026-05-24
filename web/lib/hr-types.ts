import type { Department } from '@/lib/types'

export type HrEmploymentType = 'employee' | 'volunteer'
export type HrEmploymentStatus = 'active' | 'on_leave' | 'terminated' | 'archived'

export type HrEmergencyContact = {
  name: string
  phone: string
  relationship?: string
}

export type HrEmployeeRecord = {
  id: string
  employeeNumber: string
  userId: string | null
  fullName: string
  department: Department
  roleTitle: string
  employmentType: HrEmploymentType
  phone: string
  email: string
  dateOfBirth: Date | null
  employmentStatus: HrEmploymentStatus
  salaryAmount: number | null
  salaryCurrency: string
  stipendAmount: number | null
  emergencyContact: HrEmergencyContact | null
  nationalId: string | null
  profileImageUrl: string | null
  hiredAt: Date | null
  archivedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type HrEmployeeDocument = {
  id: string
  employeeId: string
  docType: string
  name: string
  storageKey: string | null
  mimeType: string | null
  sizeBytes: number | null
  createdAt: Date
}

export type HrAssetStatus = 'in_use' | 'in_storage' | 'maintenance' | 'disposed'
export type HrAssetCondition = 'good' | 'fair' | 'poor' | 'damaged'

export type HrAssetRecord = {
  id: string
  assetTag: string
  name: string
  category: string
  serialNumber: string | null
  condition: HrAssetCondition
  warrantyExpiry: Date | null
  location: string
  acquiredAt: Date | null
  cost: number | null
  status: HrAssetStatus
  custodianEmployeeId: string | null
  custodianName: string | null
  notes: string
  createdAt: Date
  updatedAt: Date
}

export type HrAssetAssignment = {
  id: string
  assetId: string
  employeeId: string
  employeeName: string
  assignedAt: Date
  returnedAt: Date | null
  notes: string
  conditionAtAssign: string | null
  conditionAtReturn: string | null
}

export type HrPayrollRunStatus =
  | 'draft'
  | 'submitted'
  | 'hr_approved'
  | 'finance_approved'
  | 'disbursed'
  | 'rejected'

export type HrPayrollLineType = 'salary' | 'stipend'

export type HrPayrollRun = {
  id: string
  period: string
  title: string
  status: HrPayrollRunStatus
  defaultTaxRatePct: number
  notes: string
  submittedAt: Date | null
  hrApprovedAt: Date | null
  hrApprovedBy: string | null
  financeApprovedAt: Date | null
  financeApprovedBy: string | null
  disbursedAt: Date | null
  disbursedBy: string | null
  rejectedAt: Date | null
  rejectedBy: string | null
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
}

export type HrPayrollLine = {
  id: string
  runId: string
  employeeId: string
  employeeName?: string
  employeeNumber?: string
  lineType: HrPayrollLineType
  gross: number
  allowances: number
  deductions: number
  overtimeAmount: number
  taxAmount: number
  net: number
  notes: string
  createdAt: Date
  updatedAt: Date
}

export type HrSubscriptionType =
  | 'software'
  | 'insurance'
  | 'certification'
  | 'vendor'
  | 'other'

export type HrSubscriptionStatus = 'active' | 'expired' | 'cancelled'

export type HrSubscription = {
  id: string
  name: string
  subscriptionType: HrSubscriptionType
  vendor: string
  accountRef: string
  cost: number | null
  currency: string
  expiresAt: Date
  status: HrSubscriptionStatus
  reminderDays: number
  lastReminderAt: Date | null
  notes: string
  createdAt: Date
  updatedAt: Date
}
