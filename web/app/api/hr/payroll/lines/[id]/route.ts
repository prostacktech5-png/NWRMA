import { tryRespondWithDbSetupHint } from '@/lib/db'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { canHr } from '@/lib/hr-access-policy'
import { hrPayrollLineToJson, updatePayrollLine } from '@/lib/hr-payroll-store'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) return Response.json({ error: 'Authentication required.' }, { status: 401 })
    if (!canHr(viewer, 'manage_payroll')) {
      return Response.json({ error: 'Not allowed.' }, { status: 403 })
    }
    const { id } = await params
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const line = await updatePayrollLine(
      id,
      {
        allowances: body.allowances != null ? Number(body.allowances) : undefined,
        deductions: body.deductions != null ? Number(body.deductions) : undefined,
        overtimeAmount:
          body.overtimeAmount != null ? Number(body.overtimeAmount) : undefined,
        notes: body.notes != null ? String(body.notes) : undefined,
      },
      viewer.id
    )
    if (!line) return Response.json({ error: 'Cannot update line.' }, { status: 400 })
    return Response.json({ line: hrPayrollLineToJson(line) })
  })
}
