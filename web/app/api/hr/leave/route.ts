import { tryRespondWithDbSetupHint } from '@/lib/db'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { createLeaveRequest, getDgLeaveStore } from '@/lib/dg-leave-store'
import { canHr } from '@/lib/hr-access-policy'
import { getHrEmployeeById } from '@/lib/hr-employee-store'
import type { LeaveType } from '@/lib/types'

const VALID_TYPES: LeaveType[] = [
  'annual',
  'sick',
  'maternity',
  'paternity',
  'compassionate',
  'unpaid',
]

export async function GET(req: Request) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 })
    }
    if (!canHr(viewer, 'view_hr_hub')) {
      return Response.json({ error: 'HR access required.' }, { status: 403 })
    }
    const leaves = await getDgLeaveStore()
    return Response.json({
      leaves: leaves.map((l) => ({
        ...l,
        start: l.start.toISOString().slice(0, 10),
        end: l.end.toISOString().slice(0, 10),
        createdAt: l.createdAt.toISOString(),
      })),
    })
  })
}

export async function POST(req: Request) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 })
    }
    if (!canHr(viewer, 'create_leave')) {
      return Response.json({ error: 'Not allowed to create leave.' }, { status: 403 })
    }
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const employeeId = String(body.employeeId ?? '').trim()
    const start = String(body.start ?? '')
    const end = String(body.end ?? '')
    const type = String(body.type ?? 'annual') as LeaveType
    const comment = String(body.comment ?? body.reason ?? '').trim()

    if (!employeeId || !start || !end) {
      return Response.json({ error: 'employeeId, start, and end are required.' }, { status: 400 })
    }
    if (!VALID_TYPES.includes(type)) {
      return Response.json({ error: 'Invalid leave type.' }, { status: 400 })
    }

    const employee = await getHrEmployeeById(employeeId)
    const employeeName =
      (employee?.fullName ?? String(body.employeeName ?? '').trim()) || 'Unknown'

    const row = await createLeaveRequest({
      employeeId,
      employeeName,
      start: new Date(start),
      end: new Date(end),
      type,
      comment,
    })

    return Response.json(
      {
        leave: {
          ...row,
          start: row.start.toISOString().slice(0, 10),
          end: row.end.toISOString().slice(0, 10),
          createdAt: row.createdAt.toISOString(),
        },
      },
      { status: 201 }
    )
  })
}
