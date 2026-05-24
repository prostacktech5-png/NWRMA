import { listLicenseApplications } from '@/lib/db/license-application-persistence'
import { withSuperAdminAuth } from '@/lib/super-admin/api-auth'

export async function GET(req: Request) {
  return withSuperAdminAuth(req, 'licenses', 'read', async () => {
    const url = new URL(req.url)
    const status = url.searchParams.get('status') ?? undefined
    const search = url.searchParams.get('search') ?? undefined
    const limit = Number(url.searchParams.get('limit') ?? 100)
    const offset = Number(url.searchParams.get('offset') ?? 0)
    const result = await listLicenseApplications({ status, search, limit, offset })
    return Response.json(result)
  })
}
