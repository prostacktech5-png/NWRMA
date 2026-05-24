import { tryRespondWithDbSetupHint } from '@/lib/db'
import { buildHydroActivityReport, canViewHydroActivityReport } from '@/lib/hydro-activity-report-builder'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { parseHydroReportSectionsParam } from '@/lib/hydro-activity-report.types'

export async function GET(req: Request) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) {
      return Response.json(
        { error: 'Send X-Acting-User-Id to identify the ERP user (demo auth).' },
        { status: 401 }
      )
    }
    if (!canViewHydroActivityReport(viewer)) {
      return Response.json(
        { error: 'Hydrological departmental reports are restricted to hydrology staff (and DG / admin).' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    if (!from || !to) {
      return Response.json(
        {
          error: 'Query parameters "from" and "to" are required (ISO date, e.g. YYYY-MM-DD).',
        },
        { status: 400 }
      )
    }

    const periodStart = new Date(from)
    const periodEnd = new Date(to)
    if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
      return Response.json({ error: 'Invalid date range.' }, { status: 400 })
    }
    if (periodStart.getTime() > periodEnd.getTime()) {
      return Response.json(
        { error: '"from" must be on or before "to".' },
        { status: 400 }
      )
    }

    const sections = parseHydroReportSectionsParam(searchParams.get('sections'))
    const report = await buildHydroActivityReport({ periodStart, periodEnd, sections })
    return Response.json(report)
  })
}
