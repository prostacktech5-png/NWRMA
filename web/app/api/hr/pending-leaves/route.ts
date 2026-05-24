import { tryRespondWithDbSetupHint } from '@/lib/db'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { getDgLeaveStore } from '@/lib/dg-leave-store'
import { canHrHeadDecideLeave } from '@/lib/leave-approval-policy'

const MS_DAY = 86_400_000

export async function GET(req: Request) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 })
    }
    if (!canHrHeadDecideLeave(viewer)) {
      return Response.json(
        { error: 'Only the Human Resources HoD (or administrator) can view this queue.' },
        { status: 403 }
      )
    }
    const leaves = await getDgLeaveStore()
    const hod = leaves.filter((l) => l.status === 'hod_review')
    return Response.json({
      leaves: hod.map((l) => {
        const start = new Date(l.start)
        const end = new Date(l.end)
        const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / MS_DAY) + 1)
        return {
          id: l.id,
          employeeName: l.employeeName,
          type: l.type,
          start: start.toISOString().slice(0, 10),
          end: end.toISOString().slice(0, 10),
          days,
          reason: l.comment,
          status: l.status,
        }
      }),
    })
  })
}
