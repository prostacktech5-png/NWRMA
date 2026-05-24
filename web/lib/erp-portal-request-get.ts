import { resolveActingUserIdFromRequest } from '@/lib/demo-acting-user'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { toCanonicalDept, type CanonicalDept } from '@/lib/orgDepartments'
import { buildErpPortalRequestFormPayload } from '@/lib/portal-request-submit'

/** Authenticated GET handler for ERP portal request forms. */
export async function respondErpPortalRequestFormGet(req: Request): Promise<Response> {
  if (!process.env.DATABASE_URL?.trim()) {
    return Response.json(
      {
        error: 'Database is not configured.',
        hint:
          'Add DATABASE_URL to web/.env.local with your Supabase Postgres connection string (Project Settings → Database → URI).',
        code: 'DATABASE_URL_MISSING',
      },
      { status: 503 },
    )
  }

  const actingId = await resolveActingUserIdFromRequest(req)
  if (!actingId) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 })
  }

  const viewer = await resolveDemoViewerFromRequest(req)
  if (!viewer) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const deptParam = url.searchParams.get('department')?.trim()
    const extraDepartment =
      deptParam && toCanonicalDept(deptParam) ? (deptParam as CanonicalDept) : undefined
    const payload = await buildErpPortalRequestFormPayload(viewer, { extraDepartment })
    return Response.json(payload)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load form data.'
    return Response.json(
      {
        error: 'Could not load form data.',
        hint: message,
        code: 'ERP_PORTAL_FORM_LOAD_FAILED',
      },
      { status: 500 },
    )
  }
}
