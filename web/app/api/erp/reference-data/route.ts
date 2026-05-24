import { tryRespondWithDbSetupHint } from '@/lib/db'
import { loadOrSeedErpReferencePayload } from '@/lib/db/reference-data-persistence'

/**
 * GET — full ERP reference snapshot (budget lines, directory-related lists, notifications, …).
 * Persisted in Supabase table `erp_reference_snapshot`.
 */
export async function GET() {
  return tryRespondWithDbSetupHint(async () => {
    const payload = await loadOrSeedErpReferencePayload()
    return Response.json({ ok: true, payload })
  })
}
