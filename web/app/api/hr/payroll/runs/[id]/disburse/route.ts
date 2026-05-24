import { tryRespondWithDbSetupHint } from '@/lib/db'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { canHr } from '@/lib/hr-access-policy'
import { canDisbursePayroll } from '@/lib/hr-payroll-policy'
import {
  disbursePayrollRun,
  getPayrollRunById,
  hrPayrollRunToJson,
} from '@/lib/hr-payroll-store'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) return Response.json({ error: 'Authentication required.' }, { status: 401 })
    if (!canHr(viewer, 'approve_payroll_finance')) {
      return Response.json({ error: 'Finance access required.' }, { status: 403 })
    }
    const { id } = await params
    const run = await getPayrollRunById(id)
    if (!run) return Response.json({ error: 'Not found.' }, { status: 404 })
    if (!canDisbursePayroll(viewer, run.status)) {
      return Response.json({ error: 'Cannot disburse.' }, { status: 403 })
    }
    const actorName = viewer.name ?? viewer.email ?? viewer.id
    const result = await disbursePayrollRun(id, viewer.id, actorName)
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status })
    return Response.json({ run: hrPayrollRunToJson(result.run) })
  })
}
