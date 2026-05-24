import { tryRespondWithDbSetupHint } from '@/lib/db'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { canHr } from '@/lib/hr-access-policy'
import {
  aggregateRunTotals,
  createPayrollRun,
  generateLinesFromEmployees,
  hrPayrollLineToJson,
  hrPayrollRunToJson,
  listPayrollLines,
  listPayrollRuns,
} from '@/lib/hr-payroll-store'

export async function GET(req: Request) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) return Response.json({ error: 'Authentication required.' }, { status: 401 })
    if (!canHr(viewer, 'view_payroll')) {
      return Response.json({ error: 'HR access required.' }, { status: 403 })
    }
    const runs = await listPayrollRuns()
    const withTotals = await Promise.all(
      runs.map(async (run) => {
        const lines = await listPayrollLines(run.id)
        return { ...hrPayrollRunToJson(run), totals: aggregateRunTotals(lines) }
      })
    )
    return Response.json({ runs: withTotals })
  })
}

export async function POST(req: Request) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) return Response.json({ error: 'Authentication required.' }, { status: 401 })
    if (!canHr(viewer, 'manage_payroll')) {
      return Response.json({ error: 'Not allowed to manage payroll.' }, { status: 403 })
    }
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const period = String(body.period ?? '').trim()
    if (!/^\d{4}-\d{2}$/.test(period)) {
      return Response.json({ error: 'period must be YYYY-MM.' }, { status: 400 })
    }
    const run = await createPayrollRun({
      period,
      title: body.title != null ? String(body.title) : undefined,
      defaultTaxRatePct:
        body.defaultTaxRatePct != null ? Number(body.defaultTaxRatePct) : undefined,
      notes: body.notes != null ? String(body.notes) : undefined,
      createdBy: viewer.id,
    })
    if (body.generateLines === true) {
      await generateLinesFromEmployees(run.id, viewer.id)
    }
    const lines = await listPayrollLines(run.id)
    return Response.json(
      {
        run: hrPayrollRunToJson(run),
        lines: lines.map(hrPayrollLineToJson),
        totals: aggregateRunTotals(lines),
      },
      { status: 201 }
    )
  })
}
