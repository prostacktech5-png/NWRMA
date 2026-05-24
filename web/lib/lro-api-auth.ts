import { tryRespondWithDbSetupHint } from '@/lib/db'
import { canCompliance, type ComplianceCapability } from '@/lib/compliance-access-policy'
import { resolvePlatformViewerFromRequest } from '@/lib/rbac/resolve-viewer'
import { seedLroIfEmpty } from '@/lib/lro-store'

export async function withComplianceApi(
  req: Request,
  cap: ComplianceCapability,
  handler: (viewer: NonNullable<Awaited<ReturnType<typeof resolvePlatformViewerFromRequest>>>) => Promise<Response>
): Promise<Response> {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolvePlatformViewerFromRequest(req)
    if (!viewer) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 })
    }
    if (!canCompliance(viewer, cap)) {
      return Response.json({ error: 'Compliance access required.' }, { status: 403 })
    }
    await seedLroIfEmpty(viewer.id)
    return handler(viewer)
  })
}
