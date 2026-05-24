import { tryRespondWithDbSetupHint } from '@/lib/db'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { canHr } from '@/lib/hr-access-policy'
import {
  createHrEmployee,
  hrEmployeeToJson,
  listHrEmployees,
} from '@/lib/hr-employee-store'
import { importHrEmployeesFromErpIfEmpty } from '@/lib/hr-migrate-from-erp'
import type { Department } from '@/lib/types'

export async function GET(req: Request) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 })
    }
    if (!canHr(viewer, 'view_employees')) {
      return Response.json({ error: 'HR access required.' }, { status: 403 })
    }

    await importHrEmployeesFromErpIfEmpty()
    const url = new URL(req.url)
    const search = url.searchParams.get('search') ?? undefined
    const includeArchived = url.searchParams.get('includeArchived') === '1'
    const employees = await listHrEmployees({ search, includeArchived })
    return Response.json({ employees: employees.map(hrEmployeeToJson) })
  })
}

export async function POST(req: Request) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 })
    }
    if (!canHr(viewer, 'manage_employees')) {
      return Response.json({ error: 'Not allowed to manage employees.' }, { status: 403 })
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const fullName = String(body.fullName ?? '').trim()
    const roleTitle = String(body.roleTitle ?? body.title ?? '').trim()
    const department = String(body.department ?? 'hr').trim().toLowerCase() as Department
    if (!fullName || !roleTitle) {
      return Response.json({ error: 'fullName and roleTitle are required.' }, { status: 400 })
    }

    const employee = await createHrEmployee(
      {
        fullName,
        department,
        roleTitle,
        employmentType: body.employmentType === 'volunteer' ? 'volunteer' : 'employee',
        phone: String(body.phone ?? ''),
        email: String(body.email ?? ''),
        dateOfBirth: body.dateOfBirth != null ? String(body.dateOfBirth) : null,
        salaryAmount: body.salaryAmount != null ? Number(body.salaryAmount) : null,
        stipendAmount: body.stipendAmount != null ? Number(body.stipendAmount) : null,
        nationalId: body.nationalId != null ? String(body.nationalId) : null,
        profileImageUrl: body.profileImageUrl != null ? String(body.profileImageUrl) : null,
        hiredAt: body.hiredAt != null ? String(body.hiredAt) : null,
        userId: body.userId != null ? String(body.userId) : null,
        emergencyContact:
          body.emergencyContact && typeof body.emergencyContact === 'object'
            ? (body.emergencyContact as { name: string; phone: string; relationship?: string })
            : null,
      },
      viewer.id
    )

    return Response.json({ employee: hrEmployeeToJson(employee) }, { status: 201 })
  })
}
