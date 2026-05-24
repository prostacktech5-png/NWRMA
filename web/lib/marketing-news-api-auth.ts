import { tryRespondWithDbSetupHint } from '@/lib/db'
import { canManageOrgSettings } from '@/lib/settings-access-policy'
import { resolvePlatformViewerFromRequest } from '@/lib/rbac/resolve-viewer'

export async function withMarketingNewsAdminApi(
  req: Request,
  handler: () => Promise<Response>,
): Promise<Response> {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolvePlatformViewerFromRequest(req)
    if (!viewer) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 })
    }
    if (!canManageOrgSettings(viewer)) {
      return Response.json({ error: 'Not allowed.' }, { status: 403 })
    }
    return handler()
  })
}
