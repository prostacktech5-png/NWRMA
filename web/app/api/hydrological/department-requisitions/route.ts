import { tryRespondWithDbSetupHint } from '@/lib/db'
import { listAllHydrologicalPublicRequests } from '@/lib/db/portal-persistence'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { getFinanceApiStore, parseRequisitionJson } from '@/lib/finance-api-store'
import { financeBudgetDepartmentMatches } from '@/lib/orgDepartments'
import {
  canViewPortalSubmissions,
  filterPortalRequestsForViewer,
} from '@/lib/portal-request-policy'
import { normalizePublicReqHodWorkflow } from '@/lib/hydro-public-portals-stub'

export async function GET(req: Request) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) {
      return Response.json(
        { error: 'Send X-Acting-User-Id to identify the ERP user (demo auth).' },
        { status: 401 },
      )
    }
    if (!canViewPortalSubmissions(viewer)) {
      return Response.json(
        {
          error:
            'Portal submissions are visible to department staff, Heads of Department, Director General, and administrators.',
        },
        { status: 403 },
      )
    }

    const fin = await getFinanceApiStore()
    const erpRequisitions = fin.requisitions
      .filter((r) => {
        if (viewer.role === 'dg') return true
        if (!viewer.department) return false
        return financeBudgetDepartmentMatches(r.department, viewer.department)
      })
      .map(parseRequisitionJson)

    const portalRows = filterPortalRequestsForViewer(
      await listAllHydrologicalPublicRequests(),
      viewer,
    )
    const portalSubmissions = portalRows.map((r) => ({
      ...r,
      hodWorkflow: normalizePublicReqHodWorkflow(r),
    }))

    return Response.json({ erpRequisitions, portalSubmissions })
  })
}
