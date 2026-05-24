import { timingSafeEqual } from 'node:crypto'

/** Server-only secret for external water testing intake. */
export function getExpectedWaterTestingApiKey(): string | undefined {
  const k = process.env.WATER_TESTING_API_KEY?.trim()
  return k && k.length > 0 ? k : undefined
}

export function extractProvidedWaterTestingApiKey(req: Request): string | null {
  const h = req.headers.get('x-water-testing-api-key')?.trim()
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

export type WaterTestingPublicAuth =
  | { authorized: true; devOpen: boolean }
  | { authorized: false; reason: string }

/**
 * When `WATER_TESTING_API_KEY` is set: require matching header.
 * When unset: allow POST (local dev only) with devOpen flag.
 */
export function authorizeWaterTestingPublicRequest(req: Request): WaterTestingPublicAuth {
  const expected = getExpectedWaterTestingApiKey()
  if (!expected) {
    if (process.env.NODE_ENV === 'production') {
      return {
        authorized: false,
        reason: 'WATER_TESTING_API_KEY is not configured on the server.',
      }
    }
    console.warn(
      '[water-testing] WATER_TESTING_API_KEY unset — public intake is open (dev only).',
    )
    return { authorized: true, devOpen: true }
  }

  const provided = extractProvidedWaterTestingApiKey(req)
  if (!provided || !constantTimeEqualString(provided, expected)) {
    return {
      authorized: false,
      reason: 'Invalid or missing API key. Send X-Water-Testing-Api-Key or Authorization: Bearer.',
    }
  }
  return { authorized: true, devOpen: false }
}
