import {
  countAssignedPlatformUsers,
  countUsersPerRole,
  getAllRolePermissionIds,
  listAllPermissions,
  listPlatformRoles,
} from '@/lib/db/rbac-persistence'
import { departmentLabel } from '@/lib/org-departments'
import {
  departmentPermissionGroupCount,
  filterPermissionsForRbacUi,
} from '@/lib/rbac/section-permissions'
import { withSuperAdminAuth } from '@/lib/super-admin/api-auth'

export async function GET(req: Request) {
  return withSuperAdminAuth(req, 'users', 'read', async () => {
    const [roles, allPermissions, matrix, userCounts, assignedUsers] = await Promise.all([
      listPlatformRoles(),
      listAllPermissions(),
      getAllRolePermissionIds(),
      countUsersPerRole(),
      countAssignedPlatformUsers(),
    ])

    const permissions = filterPermissionsForRbacUi(allPermissions)
    const visiblePermIds = new Set(permissions.map((p) => p.id))

    const enrichedRoles = roles.map((role) => {
      const permissionIds = (matrix[role.id] ?? []).filter((id) => visiblePermIds.has(id))
      const depts = new Set(
        permissions.filter((p) => permissionIds.includes(p.id)).map((p) => {
          if (p.resource === 'field_ops' || p.resource === 'reports') return 'hydrological'
          if (p.resource === 'licenses') return 'boreholes'
          if (p.resource === 'water_quality') return 'water_quality'
          if (p.resource === 'finance') return 'financial'
          if (p.resource === 'documents') return 'hr'
          if (p.resource === 'boreholes') return 'boreholes'
          return p.resource
        }),
      )
      const groupLabel =
        depts.size === 1
          ? departmentLabel([...depts][0] ?? null)
          : depts.size > 1
            ? 'Mixed'
            : '—'
      return {
        ...role,
        userCount: userCounts.get(role.id) ?? 0,
        permissionCount: permissionIds.length,
        permissionGroup: groupLabel,
        status: 'active' as const,
      }
    })

    const filteredMatrix: Record<string, string[]> = {}
    for (const [roleId, ids] of Object.entries(matrix)) {
      filteredMatrix[roleId] = ids.filter((id) => visiblePermIds.has(id))
    }

    return Response.json({
      roles: enrichedRoles,
      permissions,
      matrix: filteredMatrix,
      stats: {
        totalRoles: roles.length,
        totalPermissions: permissions.length,
        assignedUsers,
        permissionGroups: departmentPermissionGroupCount(),
      },
    })
  })
}
