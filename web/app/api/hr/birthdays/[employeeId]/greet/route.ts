import { tryRespondWithDbSetupHint } from '@/lib/db'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { canHr } from '@/lib/hr-access-policy'
import { notifyBirthdayGreeting } from '@/lib/hr-birthday-notify'
import { getHrEmployeeById } from '@/lib/hr-employee-store'

type Params = { params: Promise<{ employeeId: string }> }

export async function POST(req: Request, { params }: Params) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) return Response.json({ error: 'Authentication required.' }, { status: 401 })
    if (!canHr(viewer, 'manage_employees')) {
      return Response.json({ error: 'Not allowed.' }, { status: 403 })
    }
    const { employeeId } = await params
    const emp = await getHrEmployeeById(employeeId)
    if (!emp) return Response.json({ error: 'Employee not found.' }, { status: 404 })

    const result = await notifyBirthdayGreeting({
      employeeId: emp.id,
      employeeName: emp.fullName,
      to: emp.email,
    })
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 })
    return Response.json({ ok: true })
  })
}
