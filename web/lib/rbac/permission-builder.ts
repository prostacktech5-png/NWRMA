import { PLATFORM_ACTIONS, PLATFORM_RESOURCES } from '@/lib/rbac/permissions'

export function buildPermissionMatrix(
  permissions: { id: string; resource: string; action: string }[],
  grantedIds: Set<string>
): {
  resources: typeof PLATFORM_RESOURCES
  actions: typeof PLATFORM_ACTIONS
  cells: Record<string, Record<string, { id: string; granted: boolean }>>
} {
  const cells: Record<string, Record<string, { id: string; granted: boolean }>> = {}
  for (const resource of PLATFORM_RESOURCES) {
    cells[resource] = {}
    for (const action of PLATFORM_ACTIONS) {
      const perm = permissions.find((p) => p.resource === resource && p.action === action)
      cells[resource][action] = {
        id: perm?.id ?? '',
        granted: perm ? grantedIds.has(perm.id) : false,
      }
    }
  }
  return { resources: PLATFORM_RESOURCES, actions: PLATFORM_ACTIONS, cells }
}
