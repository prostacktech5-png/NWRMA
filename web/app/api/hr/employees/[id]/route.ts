import { tryRespondWithDbSetupHint } from '@/lib/db'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { canHr } from '@/lib/hr-access-policy'
import {
  archiveHrEmployee,
  getHrEmployeeById,
  hrEmployeeToJson,
  updateHrEmployee,
} from '@/lib/hr-employee-store'
import type { Department } from '@/lib/types'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Params) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 })
    }
    if (!canHr(viewer, 'view_employees')) {
      return Response.json({ error: 'HR access required.' }, { status: 403 })
    }
    const { id } = await params
    const employee = await getHrEmployeeById(id)
    if (!employee) {
      return Response.json({ error: 'Employee not found.' }, { status: 404 })
    }
    return Response.json({ employee: hrEmployeeToJson(employee) })
  })
}

export async function PATCH(req: Request, { params }: Params) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 })
    }
    if (!canHr(viewer, 'manage_employees')) {
      return Response.json({ error: 'Not allowed.' }, { status: 403 })
    }
    const { id } = await params
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const employee = await updateHrEmployee(
      id,
      {
        fullName: body.fullName != null ? String(body.fullName) : undefined,
        roleTitle: body.roleTitle != null ? String(body.roleTitle) : undefined,
        department:
          body.department != null ? (String(body.department) as Department) : undefined,
        phone: body.phone != null ? String(body.phone) : undefined,
        email: body.email != null ? String(body.email) : undefined,
        dateOfBirth: body.dateOfBirth !== undefined ? String(body.dateOfBirth || '') || null : undefined,
        employmentStatus: body.employmentStatus as 'active' | 'on_leave' | 'terminated' | undefined,
        salaryAmount: body.salaryAmount !== undefined ? Number(body.salaryAmount) : undefined,
        stipendAmount: body.stipendAmount !== undefined ? Number(body.stipendAmount) : undefined,
        nationalId: body.nationalId !== undefined ? String(body.nationalId || '') || null : undefined,
        profileImageUrl:
          body.profileImageUrl !== undefined ? String(body.profileImageUrl || '') || null : undefined,
      },
      viewer.id
    )
    if (!employee) {
      return Response.json({ error: 'Employee not found.' }, { status: 404 })
    }
    return Response.json({ employee: hrEmployeeToJson(employee) })
  })
}

export async function DELETE(req: Request, { params }: Params) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 })
    }
    if (!canHr(viewer, 'manage_employees')) {
      return Response.json({ error: 'Not allowed.' }, { status: 403 })
    }
    const { id } = await params
    const employee = await archiveHrEmployee(id, viewer.id)
    if (!employee) {
      return Response.json({ error: 'Employee not found.' }, { status: 404 })
    }
    return Response.json({ employee: hrEmployeeToJson(employee) })
  })
}
