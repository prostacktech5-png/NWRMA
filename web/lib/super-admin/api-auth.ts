import { tryRespondWithDbSetupHint } from '@/lib/db'
import { resolvePlatformViewerFromRequest } from '@/lib/rbac/resolve-viewer'
import {
  permissionDeniedResponse,
  requirePermission,
  unauthorizedResponse,
} from '@/lib/rbac/require-permission'
import type { PlatformAction, PlatformResource } from '@/lib/rbac/permissions'
import type { PlatformViewer } from '@/lib/rbac/permissions'

export async function withSuperAdminAuth(
  req: Request,
  resource: PlatformResource,
  action: PlatformAction,
  handler: (viewer: PlatformViewer, req: Request) => Promise<Response>
): Promise<Response> {
  return tryRespondWithDbSetupHint(async () => {
    try {
      const viewer = await resolvePlatformViewerFromRequest(req)
      if (!viewer) return unauthorizedResponse()
      requirePermission(viewer, resource, action)
      return await handler(viewer, req)
    } catch (e) {
      if (e && typeof e === 'object' && 'status' in e && (e as { status: number }).status === 403) {
        return permissionDeniedResponse(e)
      }
      throw e
    }
  })
}
