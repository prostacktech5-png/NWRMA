import { pingDatabase } from '@/lib/db'

/**
 * GET /api/health/db — verifies Supabase `DATABASE_URL` from the server (no secrets in response).
 */
export async function GET() {
  try {
    const result = await pingDatabase()
    if (!result.ok) {
      return Response.json({ ok: false, error: result.message }, { status: 503 })
    }
    return Response.json({ ok: true, database: 'connected' })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Configuration error.'
    return Response.json({ ok: false, error: message }, { status: 503 })
  }
}
