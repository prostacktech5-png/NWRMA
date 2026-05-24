import {
  submitPerDiemRequest,
  submitStaffRequest,
} from '@/lib/db/portal-persistence'
import {
  buildPublicFormBudgetPayload,
  validatePortalSubmissionAmount,
} from '@/lib/public-portal-budget'
import { toCanonicalDept, type CanonicalDept } from '@/lib/orgDepartments'
import type { User } from '@/lib/types'

export type PortalRequestPrefill = {
  name: string
  email: string
  department: CanonicalDept | null
  lockDepartment: boolean
}

export type PortalRequestFormPayload = {
  departments: Awaited<ReturnType<typeof buildPublicFormBudgetPayload>>['departments']
  budgetLinesByDepartment: Awaited<
    ReturnType<typeof buildPublicFormBudgetPayload>
  >['budgetLinesByDepartment']
  prefill: PortalRequestPrefill
}

export function erpPortalTokenForUser(userId: string): string {
  return `erp:${userId}`
}

/** Departments whose budget lines are included in the initial portal form payload. */
function budgetDepartmentsForViewer(
  viewer: User,
  extraDepartment?: CanonicalDept,
): CanonicalDept[] | undefined {
  const viewerDept =
    viewer.department && toCanonicalDept(viewer.department) ?
      (viewer.department as CanonicalDept)
    : null

  if (viewer.role === 'dg' || viewer.role === 'admin' || viewer.department === 'financial') {
    return undefined
  }

  const depts: CanonicalDept[] = viewerDept ? [viewerDept] : []
  if (extraDepartment && !depts.includes(extraDepartment)) {
    depts.push(extraDepartment)
  }
  if (depts.length === 0) return undefined
  return depts
}

export async function buildErpPortalRequestFormPayload(
  viewer: User,
  options?: { extraDepartment?: CanonicalDept },
): Promise<PortalRequestFormPayload> {
  const deptFilter = budgetDepartmentsForViewer(viewer, options?.extraDepartment)
  const budget = await buildPublicFormBudgetPayload(deptFilter)
  const dept =
    viewer.department && toCanonicalDept(viewer.department) ?
      (viewer.department as CanonicalDept)
    : null
  return {
    ...budget,
    prefill: {
      name: viewer.name.trim(),
      email: viewer.email.trim().toLowerCase(),
      department: dept,
      lockDepartment: viewer.role === 'staff' || viewer.role === 'hod',
    },
  }
}

export function canPickAnyPortalDepartment(viewer: User): boolean {
  return budgetDepartmentsForViewer(viewer) === undefined
}

export type PortalSubmitBody = {
  title: string
  description: string
  requestedBy: string
  requesterEmail: string
  amount: number
  department: string
  budgetCode: string
}

function parseSubmitBody(body: unknown): PortalSubmitBody | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'Invalid JSON body.' }
  const o = body as Record<string, unknown>
  const title = typeof o.title === 'string' ? o.title.trim() : ''
  const description = typeof o.description === 'string' ? o.description.trim() : ''
  const requestedBy = typeof o.requestedBy === 'string' ? o.requestedBy.trim() : ''
  const requesterEmail =
    typeof o.requesterEmail === 'string' ? o.requesterEmail.trim().toLowerCase() : ''
  const department = typeof o.department === 'string' ? o.department.trim() : ''
  const budgetCode = typeof o.budgetCode === 'string' ? o.budgetCode.trim() : ''
  const amount = typeof o.amount === 'number' ? o.amount : Number(o.amount)

  if (!title || title.length < 2) return { error: 'Title is required.' }
  if (!requestedBy || requestedBy.length < 2) return { error: 'Your name is required.' }
  if (!requesterEmail || !requesterEmail.includes('@')) {
    return { error: 'A valid email address is required.' }
  }
  if (!department || !toCanonicalDept(department)) {
    return { error: 'Select a valid department.' }
  }
  if (!budgetCode) return { error: 'Budget code is required.' }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'Amount must be greater than zero.' }
  }

  return {
    title,
    description,
    requestedBy,
    requesterEmail,
    amount,
    department,
    budgetCode,
  }
}

export async function submitErpPortalStaffRequest(
  viewer: User,
  body: unknown,
): Promise<{ id: number } | { error: string; status: number }> {
  const parsed = parseSubmitBody(body)
  if ('error' in parsed) return { error: parsed.error, status: 400 }

  if (
    (viewer.role === 'staff' || viewer.role === 'hod') &&
    viewer.department &&
    toCanonicalDept(parsed.department) !== viewer.department
  ) {
    return { error: 'You can only submit requests for your own department.', status: 403 }
  }

  const amountCheck = await validatePortalSubmissionAmount(
    parsed.department,
    parsed.budgetCode,
    parsed.amount,
  )
  if (!amountCheck.ok) return { error: amountCheck.error, status: 400 }

  const id = await submitStaffRequest({
    token: erpPortalTokenForUser(viewer.id),
    ...parsed,
  })
  return { id }
}

export async function submitErpPortalPerDiemRequest(
  viewer: User,
  body: unknown,
): Promise<{ id: number } | { error: string; status: number }> {
  const parsed = parseSubmitBody(body)
  if ('error' in parsed) return { error: parsed.error, status: 400 }

  if (
    (viewer.role === 'staff' || viewer.role === 'hod') &&
    viewer.department &&
    toCanonicalDept(parsed.department) !== viewer.department
  ) {
    return { error: 'You can only submit requests for your own department.', status: 403 }
  }

  const amountCheck = await validatePortalSubmissionAmount(
    parsed.department,
    parsed.budgetCode,
    parsed.amount,
  )
  if (!amountCheck.ok) return { error: amountCheck.error, status: 400 }

  const id = await submitPerDiemRequest({
    token: erpPortalTokenForUser(viewer.id),
    ...parsed,
  })
  return { id }
}
