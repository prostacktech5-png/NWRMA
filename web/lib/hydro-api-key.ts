import { timingSafeEqual } from 'node:crypto'

import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'

/** Server-only secret. Field apps send this as `X-Hydro-Api-Key` or `Authorization: Bearer …`. */
export function getExpectedHydroApiKey(): string | undefined {
  const k = process.env.HYDRO_API_KEY?.trim()
  return k && k.length > 0 ? k : undefined
}

export function extractProvidedHydroApiKey(req: Request): string | null {
  const h = req.headers.get('x-hydro-api-key')?.trim()
  if (h) return h
  const xApi = req.headers.get('x-api-key')?.trim()
  if (xApi) return xApi
  const auth = req.headers.get('authorization')?.trim()
  if (auth?.toLowerCase().startsWith('bearer ')) {
    const t = auth.slice(7).trim()
    return t || null
  }
  return null
}

function constantTimeEqualString(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'utf8')
    const bb = Buffer.from(b, 'utf8')
    if (ba.length !== bb.length) return false
    return timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}

export type ReadingsIngestAuth =
  | { authorized: true; viaApiKey: boolean }
  | { authorized: false }

/**
 * When `HYDRO_API_KEY` is set: require a matching API key **or** a resolved demo / ERP viewer
 * (`X-Acting-User-Id` / `nwrma_acting_user_id` cookie). When unset, ingestion stays open (local dev).
 */
export async function authorizeReadingIngest(req: Request): Promise<ReadingsIngestAuth> {
  const expected = getExpectedHydroApiKey()
  if (!expected) {
    return { authorized: true, viaApiKey: false }
  }

  const provided = extractProvidedHydroApiKey(req)
  if (provided && constantTimeEqualString(provided, expected)) {
    return { authorized: true, viaApiKey: true }
  }

  const viewer = await resolveDemoViewerFromRequest(req)
  if (viewer) {
    return { authorized: true, viaApiKey: false }
  }

  return { authorized: false }
}
