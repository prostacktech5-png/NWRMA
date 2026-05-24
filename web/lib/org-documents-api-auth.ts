import { tryRespondWithDbSetupHint } from '@/lib/db'
import {
  canOrgDocuments,
  type OrgDocumentsCapability,
} from '@/lib/org-documents-access-policy'
import { resolvePlatformViewerFromRequest } from '@/lib/rbac/resolve-viewer'

export async function withOrgDocumentsApi(
  req: Request,
  cap: OrgDocumentsCapability,
  handler: (viewer: NonNullable<Awaited<ReturnType<typeof resolvePlatformViewerFromRequest>>>) => Promise<Response>
): Promise<Response> {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolvePlatformViewerFromRequest(req)
    if (!viewer) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 })
    }
    if (!canOrgDocuments(viewer, cap)) {
      return Response.json({ error: 'Not allowed.' }, { status: 403 })
    }
    return handler(viewer)
  })
}
