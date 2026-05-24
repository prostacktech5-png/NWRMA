import { withComplianceApi } from '@/lib/lro-api-auth'
import { getLroDashboardStats } from '@/lib/lro-store'

export async function GET(req: Request) {
  return withComplianceApi(req, 'view', async () => {
    const stats = await getLroDashboardStats()
    return Response.json({ stats })
  })
}
