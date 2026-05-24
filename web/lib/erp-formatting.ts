/** UI labels and formatters — no seeded business data. */

import {
  BOREHOLES_DEPARTMENT_DISPLAY_NAME,
  HYDROLOGICAL_SERVICES_DEPARTMENT_DISPLAY_NAME,
} from '@/lib/org-departments'

export function formatCurrency(amount: number, currency = 'SLE'): string {
  const formatted = new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
  if (currency === 'SLE') {
    return `SLE ${formatted}`
  }
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${currency} ${formatted}`
  }
}

/** Sierra Leone Leone — alias for ERP copy / OpenAPI parity */
export function formatNLe(amount: number): string {
  return formatCurrency(amount, 'SLE')
}

export const bankReceiptValidationStatusLabels: Record<string, string> = {
  pending: 'Pending validation',
  validated: 'Validated',
  rejected: 'Rejected',
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

/** Parse ERP / API values that may be Date, ISO string, or calendar date (YYYY-MM-DD). */
export function coerceToValidDate(value: unknown): Date | null {
  if (value == null || value === '') return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value === 'string') {
    const s = value.trim()
    if (!s) return null
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const d = new Date(`${s}T12:00:00`)
      return Number.isNaN(d.getTime()) ? null : d
    }
    const d = new Date(s)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

export function formatDateValue(value: unknown, fallback = '—'): string {
  const d = coerceToValidDate(value)
  if (!d) return fallback
  return formatDate(d)
}

/** For `<input type="date" />` from Date or YYYY-MM-DD. */
export function toIsoDateInputValue(value: unknown): string {
  const d = coerceToValidDate(value)
  if (d) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  if (typeof value === 'string') {
    const s = value.trim()
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  }
  return ''
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/** Time portion only (24h locale format) for reading time column */
export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

export const departmentNames: Record<string, string> = {
  hydrological: HYDROLOGICAL_SERVICES_DEPARTMENT_DISPLAY_NAME,
  boreholes: BOREHOLES_DEPARTMENT_DISPLAY_NAME,
  financial: 'Finance',
  hr: 'Human Resources',
  compliance: 'Legal, Regulations & Outreach',
}

export const requisitionStatusLabels: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  hod_review: 'HOD Review',
  admin_review: 'HR & Admin',
  dg_review: 'DG Review',
  finance_review: 'Finance Review',
  approved: 'Approved',
  rejected: 'Rejected',
  paid: 'Paid',
}

export const labRequestStatusLabels: Record<string, string> = {
  received: 'Received',
  in_progress: 'In progress',
  assigned: 'Assigned',
  testing: 'Testing',
  review: 'Under Review',
  completed: 'Completed',
  released: 'Released',
}

export const officerPaymentStatusLabels: Record<string, string> = {
  pending: 'Pending',
  submitted: 'Submitted to DG',
  approved: 'Approved',
  disbursed: 'Disbursed',
}

export const licenseApplicationStatusLabels: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under review',
  additional_info_required: 'Additional info required',
  approved: 'Approved',
  rejected: 'Rejected',
}

export const damSafetyApplicationStatusLabels: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under review',
  additional_info_required: 'Additional info required',
  approved: 'Approved',
  rejected: 'Rejected',
}

export const effluentDischargeApplicationStatusLabels: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under review',
  additional_info_required: 'Additional info required',
  approved: 'Approved',
  rejected: 'Rejected',
}

export const waterRightApplicationStatusLabels: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under review',
  additional_info_required: 'Additional info required',
  approved: 'Approved',
  rejected: 'Rejected',
}
