import { tryRespondWithDbSetupHint } from '@/lib/db'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { canHr } from '@/lib/hr-access-policy'
import {
  aggregateRunTotals,
  generateLinesFromEmployees,
  getPayrollRunById,
  hrPayrollLineToJson,
  hrPayrollRunToJson,
  listPayrollLines,
  updatePayrollRun,
} from '@/lib/hr-payroll-store'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Params) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) return Response.json({ error: 'Authentication required.' }, { status: 401 })
    if (!canHr(viewer, 'view_payroll')) {
      return Response.json({ error: 'HR access required.' }, { status: 403 })
    }
    const { id } = await params
    const run = await getPayrollRunById(id)
    if (!run) return Response.json({ error: 'Not found.' }, { status: 404 })
    const lines = await listPayrollLines(id)
    return Response.json({
      run: hrPayrollRunToJson(run),
      lines: lines.map(hrPayrollLineToJson),
      totals: aggregateRunTotals(lines),
    })
  })
}

export async function PATCH(req: Request, { params }: Params) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) return Response.json({ error: 'Authentication required.' }, { status: 401 })
    if (!canHr(viewer, 'manage_payroll')) {
      return Response.json({ error: 'Not allowed.' }, { status: 403 })
    }
    const { id } = await params
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const run = await updatePayrollRun(
      id,
      {
        title: body.title != null ? String(body.title) : undefined,
        defaultTaxRatePct:
          body.defaultTaxRatePct != null ? Number(body.defaultTaxRatePct) : undefined,
        notes: body.notes != null ? String(body.notes) : undefined,
      },
      viewer.id
    )
    if (!run) return Response.json({ error: 'Cannot update run.' }, { status: 400 })
    if (body.generateLines === true) {
      await generateLinesFromEmployees(id, viewer.id)
    }
    const lines = await listPayrollLines(id)
    return Response.json({
      run: hrPayrollRunToJson(run),
      lines: lines.map(hrPayrollLineToJson),
      totals: aggregateRunTotals(lines),
    })
  })
}
