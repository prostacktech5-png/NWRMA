import type { User } from '@/lib/types'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { canManageHydrologicalSettings, canManagePublicHydroPortalLinks } from '@/lib/hydro-settings-policy'

export type HydrologicalSettingsAuthResult =
  | { ok: true; user: User }
  | { ok: false; status: 401 | 403; error: string }

export { canManageHydrologicalSettings, canManagePublicHydroPortalLinks }

export async function authorizeHydrologicalSettingsAccess(
  req: Request
): Promise<HydrologicalSettingsAuthResult> {
  const viewer = await resolveDemoViewerFromRequest(req)
  if (!viewer) {
    return {
      ok: false,
      status: 401,
      error: 'Send X-Acting-User-Id to identify the ERP user (demo auth).',
    }
  }
  if (!canManageHydrologicalSettings(viewer)) {
    return {
      ok: false,
      status: 403,
      error:
        'Hydrological settings are restricted to the Hydrological Head of Department and administrators.',
    }
  }
  return { ok: true, user: viewer }
}

export async function authorizeAdminPublicPortalLinks(
  req: Request
): Promise<HydrologicalSettingsAuthResult> {
  const viewer = await resolveDemoViewerFromRequest(req)
  if (!viewer) {
    return {
      ok: false,
      status: 401,
      error: 'Send X-Acting-User-Id to identify the ERP user (demo auth).',
    }
  }
  if (!canManagePublicHydroPortalLinks(viewer)) {
    return {
      ok: false,
      status: 403,
      error: 'Only administrators can generate or view public form URLs.',
    }
  }
  return { ok: true, user: viewer }
}
