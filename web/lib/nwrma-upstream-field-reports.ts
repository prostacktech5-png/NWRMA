import type { FieldReportResponse } from '@nwrma/shared'
import { readNwrmaAccessTokenFromRequest } from '@/lib/session-cookies'

function serverBase(): string | null {
  const u =
    process.env.NWRMA_SERVER_URL?.trim() ?? process.env.NEXT_PUBLIC_NWRMA_SERVER_URL?.trim()
  return u && u.length > 0 ? u.replace(/\/$/, '') : null
}

/**
 * Load field reports from the NWRMA API using the same auth as `GET /api/integrations/nwrma/reports`.
 * Used server-side so monitoring can align with the readings register (which merges these rows in the browser).
 */
export async function fetchNwrmaUpstreamFieldReports(req: Request): Promise<FieldReportResponse[]> {
  const base = serverBase()
  if (!base) return []

  const headerAuth = req.headers.get('authorization')
  const token = readNwrmaAccessTokenFromRequest(req)
  const auth =
    headerAuth?.startsWith('Bearer ') && headerAuth.length > 7
      ? headerAuth
      : token
        ? `Bearer ${token}`
        : null

  if (!auth) return []

  try {
    const upstream = await fetch(`${base}/reports`, {
      method: 'GET',
      headers: {
        authorization: auth,
        accept: 'application/json',
      },
      cache: 'no-store',
    })
    if (!upstream.ok) return []
    const data: unknown = await upstream.json()
    if (data == null || typeof data !== 'object' || Array.isArray(data)) return []
    const reports = (data as { reports?: unknown }).reports
    if (!Array.isArray(reports)) return []
    return reports as FieldReportResponse[]
  } catch {
    return []
  }
}
