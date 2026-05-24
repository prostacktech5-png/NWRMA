import { tryRespondWithDbSetupHint } from '@/lib/db'
import {
  buildBoreholesActivityReport,
  canViewBoreholesActivityReport,
} from '@/lib/boreholes-activity-report-builder'
import { parseBoreholesReportSectionsParam } from '@/lib/boreholes-activity-report.types'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'

export async function GET(req: Request) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) {
      return Response.json(
        { error: 'Authentication required.', hint: 'Sign in again to load the report.' },
        { status: 401 }
      )
    }
    if (!canViewBoreholesActivityReport(viewer)) {
      return Response.json(
        {
          error:
            'Boreholes departmental reports are restricted to boreholes staff (and DG / admin).',
        },
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
      return Response.json({ error: '"from" must be on or before "to".' }, { status: 400 })
    }

    const sections = parseBoreholesReportSectionsParam(searchParams.get('sections'))
    const report = await buildBoreholesActivityReport({ periodStart, periodEnd, sections })
    return Response.json(report)
  })
}
