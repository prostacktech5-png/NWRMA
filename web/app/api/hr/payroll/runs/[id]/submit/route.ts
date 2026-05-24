import { tryRespondWithDbSetupHint } from '@/lib/db'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { canHr } from '@/lib/hr-access-policy'
import { canSubmitPayroll } from '@/lib/hr-payroll-policy'
import { hrPayrollRunToJson, submitPayrollRun, getPayrollRunById } from '@/lib/hr-payroll-store'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) return Response.json({ error: 'Authentication required.' }, { status: 401 })
    if (!canHr(viewer, 'manage_payroll')) {
      return Response.json({ error: 'Not allowed.' }, { status: 403 })
    }
    const { id } = await params
    const run = await getPayrollRunById(id)
    if (!run) return Response.json({ error: 'Not found.' }, { status: 404 })
    if (!canSubmitPayroll(viewer, run.status)) {
      return Response.json({ error: 'Cannot submit this run.' }, { status: 403 })
    }
    const result = await submitPayrollRun(id, viewer.id)
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status })
    return Response.json({ run: hrPayrollRunToJson(result.run) })
  })
}
