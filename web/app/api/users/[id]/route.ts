import { tryRespondWithDbSetupHint } from '@/lib/db'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import {
  coerceHydroNavAccess,
  hydroNavAccessAllowsAny,
} from '@/lib/hydro-nav-access'
import { getRecordById, updateUserProfileFields } from '@/lib/local-password-store'
import { canManageDirectoryUser } from '@/lib/settings-access-policy'
import { normalizeErpDepartmentKey } from '@/lib/hydrological-services-merge'
import type { Department, HydroNavAccess, Role } from '@/lib/types'

function canViewerEditTarget(
  viewer: NonNullable<Awaited<ReturnType<typeof resolveDemoViewerFromRequest>>>,
  target: NonNullable<Awaited<ReturnType<typeof getRecordById>>>,
): boolean {
  const normalized = target.department ? normalizeErpDepartmentKey(String(target.department)) : null
  const dept =
    normalized &&
    ['hydrological', 'boreholes', 'financial', 'hr', 'compliance'].includes(normalized)
      ? normalized
      : null
  const role = String(target.role).toLowerCase() as Role
  if (!['admin', 'dg', 'hod', 'staff'].includes(role)) return false
  return canManageDirectoryUser(viewer, { role, department: dept })
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const viewer = await resolveDemoViewerFromRequest(req)
  if (!viewer) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 })
  }

  const { id: rawId } = await ctx.params
  const id = typeof rawId === 'string' ? rawId.trim() : ''
  if (!id) return Response.json({ error: 'Invalid user id.' }, { status: 400 })

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  return tryRespondWithDbSetupHint(async () => {
    const target = await getRecordById(id)
    if (!target) {
      return Response.json({ error: 'User not found.' }, { status: 404 })
    }
    if (!canViewerEditTarget(viewer, target)) {
      return Response.json(
        { error: 'You do not have permission to update this user.' },
        { status: 403 },
      )
    }

    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : undefined

    let hydroNavAccess: HydroNavAccess | null | undefined
    if ('hydroNavAccess' in body) {
      if (target.role !== 'staff' || target.department !== 'hydrological') {
        return Response.json(
          { error: 'Hydrological access can only be set for Hydrological department staff.' },
          { status: 400 },
        )
      }
      const flags = coerceHydroNavAccess(body.hydroNavAccess)
      if (!hydroNavAccessAllowsAny(flags)) {
        return Response.json(
          { error: 'Select at least one Hydrological access area.' },
          { status: 400 },
        )
      }
      hydroNavAccess = flags
    }

    if (fullName === undefined && hydroNavAccess === undefined) {
      return Response.json({ error: 'No valid fields to update.' }, { status: 400 })
    }

    const result = await updateUserProfileFields(id, {
      ...(fullName !== undefined ? { fullName } : {}),
      ...(hydroNavAccess !== undefined ? { hydroNavAccess } : {}),
    })
    if (!result.ok) {
      return Response.json({ error: 'User not found.' }, { status: 404 })
    }

    return Response.json({ ok: true })
  })
}
