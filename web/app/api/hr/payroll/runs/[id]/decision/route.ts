import { tryRespondWithDbSetupHint } from '@/lib/db'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { canHr } from '@/lib/hr-access-policy'
import {
  canFinanceApprovePayroll,
  canHrApprovePayroll,
  canRejectPayroll,
} from '@/lib/hr-payroll-policy'
import {
  applyPayrollDecision,
  getPayrollRunById,
  hrPayrollRunToJson,
} from '@/lib/hr-payroll-store'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) return Response.json({ error: 'Authentication required.' }, { status: 401 })
    const { id } = await params
    const run = await getPayrollRunById(id)
    if (!run) return Response.json({ error: 'Not found.' }, { status: 404 })

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const action = body.action === 'reject' ? 'reject' : 'approve'
    const actorName = viewer.name ?? viewer.email ?? viewer.id

    if (action === 'reject') {
      if (!canRejectPayroll(viewer, run.status)) {
        return Response.json({ error: 'Cannot reject.' }, { status: 403 })
      }
    } else if (run.status === 'submitted') {
      if (!canHrApprovePayroll(viewer, run.status) || !canHr(viewer, 'manage_payroll')) {
        return Response.json({ error: 'HR approval not allowed.' }, { status: 403 })
      }
    } else if (run.status === 'hr_approved') {
      if (
        !canFinanceApprovePayroll(viewer, run.status) ||
        !canHr(viewer, 'approve_payroll_finance')
      ) {
        return Response.json({ error: 'Finance approval not allowed.' }, { status: 403 })
      }
    } else {
      return Response.json({ error: 'Nothing to approve.' }, { status: 400 })
    }

    const stage = run.status === 'submitted' ? 'hr' : 'finance'
    const result = await applyPayrollDecision(
      id,
      { action, stage },
      viewer.id,
      actorName
    )
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status })
    return Response.json({ run: hrPayrollRunToJson(result.run) })
  })
}
