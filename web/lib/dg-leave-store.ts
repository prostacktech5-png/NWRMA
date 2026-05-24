import { getSql } from '@/lib/db'
import type { LeaveRequest, LeaveStatus, User } from '@/lib/types'

function normalizeLeaveStatus(raw: unknown): LeaveStatus {
  const s = String(raw ?? '').trim().toLowerCase()
  if (s === 'pending') return 'hod_review'
  if (
    s === 'hod_review' ||
    s === 'dg_review' ||
    s === 'approved' ||
    s === 'rejected' ||
    s === 'cancelled'
  ) {
    return s
  }
  return 'hod_review'
}

export function rowToLeave(r: Record<string, unknown>): LeaveRequest {
  return {
    id: String(r.id),
    employeeId: String(r.employee_id),
    employeeName: String(r.employee_name),
    start: new Date(String(r.start_date)),
    end: new Date(String(r.end_date)),
    type: String(r.leave_type) as LeaveRequest['type'],
    status: normalizeLeaveStatus(r.status),
    approverId: r.approver_id != null ? String(r.approver_id) : null,
    approverName: r.approver_name != null ? String(r.approver_name) : null,
    comment: String(r.comment ?? ''),
    createdAt: new Date(String(r.created_at)),
  }
}

export async function getDgLeaveStore(): Promise<LeaveRequest[]> {
  const sql = getSql()
  const rows = await sql`SELECT * FROM leave_requests ORDER BY created_at DESC`
  return (rows as Record<string, unknown>[]).map(rowToLeave)
}

export async function saveDgLeaveStore(rows: LeaveRequest[]): Promise<void> {
  const sql = getSql()
  await sql`DELETE FROM leave_requests`
  for (const l of rows) {
    await sql`
      INSERT INTO leave_requests (
        id, employee_id, employee_name, start_date, end_date, leave_type, status,
        approver_id, approver_name, comment, created_at
      ) VALUES (
        ${l.id},
        ${l.employeeId},
        ${l.employeeName},
        ${l.start.toISOString().slice(0, 10)},
        ${l.end.toISOString().slice(0, 10)},
        ${l.type},
        ${l.status},
        ${l.approverId},
        ${l.approverName},
        ${l.comment},
        ${l.createdAt.toISOString()}
      )
    `
  }
}

export async function createLeaveRequest(input: {
  employeeId: string
  employeeName: string
  start: Date
  end: Date
  type: LeaveRequest['type']
  comment: string
}): Promise<LeaveRequest> {
  const rows = await getDgLeaveStore()
  const id = `lv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const row: LeaveRequest = {
    id,
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    start: input.start,
    end: input.end,
    type: input.type,
    status: 'hod_review',
    approverId: null,
    approverName: null,
    comment: input.comment,
    createdAt: new Date(),
  }
  rows.unshift(row)
  await saveDgLeaveStore(rows)
  return row
}

export async function applyHrHeadLeaveDecision(
  id: string,
  input: { action: 'approve' | 'reject' }
): Promise<
  { ok: true; row: LeaveRequest } | { ok: false; error: string; status: number }
> {
  const rows = await getDgLeaveStore()
  const row = rows.find((r) => r.id === id)
  if (!row) return { ok: false, status: 404, error: 'Not found' }
  if (row.status !== 'hod_review') {
    return { ok: false, status: 400, error: 'Leave request is not awaiting HR HoD approval.' }
  }
  if (input.action === 'reject') {
    row.status = 'rejected'
  } else {
    row.status = 'dg_review'
  }
  await saveDgLeaveStore(rows)
  return { ok: true, row }
}

export async function applyDgLeaveDecision(
  id: string,
  input: { action: 'approve' | 'reject' },
  actor: User
): Promise<
  { ok: true; row: LeaveRequest } | { ok: false; error: string; status: number }
> {
  const rows = await getDgLeaveStore()
  const row = rows.find((r) => r.id === id)
  if (!row) return { ok: false, status: 404, error: 'Not found' }
  if (row.status !== 'dg_review') {
    return { ok: false, status: 400, error: 'Leave request must be endorsed by HR HoD before DG can decide.' }
  }
  row.status = input.action === 'approve' ? 'approved' : 'rejected'
  row.approverId = actor.id
  row.approverName = actor.name
  await saveDgLeaveStore(rows)
  return { ok: true, row }
}
