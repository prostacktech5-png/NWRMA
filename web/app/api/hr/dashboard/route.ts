import { tryRespondWithDbSetupHint } from '@/lib/db'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { canAccessHrModule } from '@/lib/hr-access-policy'
import { getHrDashboardStats } from '@/lib/hr-dashboard-store'
import { importHrEmployeesFromErpIfEmpty } from '@/lib/hr-migrate-from-erp'

export async function GET(req: Request) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 })
    }
    if (!canAccessHrModule(viewer)) {
      return Response.json({ error: 'HR access required.' }, { status: 403 })
    }
    await importHrEmployeesFromErpIfEmpty()
    const stats = await getHrDashboardStats()
    return Response.json({ stats })
  })
}
