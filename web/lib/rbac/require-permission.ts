import type { PlatformViewer } from '@/lib/rbac/permissions'
import type { PlatformAction, PlatformResource } from '@/lib/rbac/permissions'
import { hasPermission } from '@/lib/rbac/check-permission'

export class PermissionDeniedError extends Error {
  readonly status = 403
  constructor(resource: string, action: string) {
    super(`Permission denied: ${resource}:${action}`)
    this.name = 'PermissionDeniedError'
  }
}

export function requirePermission(
  viewer: PlatformViewer | null,
  resource: PlatformResource,
  action: PlatformAction
): asserts viewer is PlatformViewer {
  if (!viewer) {
    throw new PermissionDeniedError(resource, action)
  }
  if (!hasPermission(viewer, resource, action)) {
    throw new PermissionDeniedError(resource, action)
  }
}

export function permissionDeniedResponse(e: unknown): Response {
  if (e instanceof PermissionDeniedError) {
    return Response.json({ error: e.message }, { status: 403 })
  }
  return Response.json({ error: 'Forbidden' }, { status: 403 })
}

export function unauthorizedResponse(): Response {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}
