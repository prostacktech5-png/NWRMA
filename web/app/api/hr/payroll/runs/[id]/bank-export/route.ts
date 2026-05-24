import { tryRespondWithDbSetupHint } from '@/lib/db'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { canHr } from '@/lib/hr-access-policy'
import {
  buildBankExportCsv,
  getPayrollRunById,
  listPayrollLines,
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
    const csv = buildBankExportCsv(lines, run.period)
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="payroll-bank-${run.period}.csv"`,
      },
    })
  })
}
