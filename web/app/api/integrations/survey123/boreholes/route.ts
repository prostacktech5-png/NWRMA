import { tryRespondWithDbSetupHint } from '@/lib/db'
import { isBoreholeSchemaMissingError } from '@/lib/db/borehole-admin-persistence'
import { insertSurvey123Intake } from '@/lib/db/borehole-registry-persistence'
import { loadOrSeedErpReferencePayload } from '@/lib/db/reference-data-persistence'
import { mapSurvey123Payload } from '@/lib/survey123-borehole-mapper'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  return tryRespondWithDbSetupHint(async () => {
    const secret = process.env.SURVEY123_WEBHOOK_SECRET?.trim()
    if (secret) {
      const header =
        req.headers.get('x-survey123-secret') ??
        req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
      if (header !== secret) {
        return Response.json({ error: 'Unauthorized webhook.' }, { status: 401 })
      }
    }

    let raw: Record<string, unknown>
    try {
      raw = (await req.json()) as Record<string, unknown>
    } catch {
      return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const fields = mapSurvey123Payload(raw)
    try {
      const payload = await loadOrSeedErpReferencePayload()
      const { intake, validationErrors } = await insertSurvey123Intake({
        fields,
        source: 'survey123_webhook',
        rawPayload: raw,
        drillingCompanies: payload.drillingCompanies,
      })
      return Response.json({
        ok: true,
        intakeId: intake.id,
        status: intake.status,
        validationErrors,
        mappingComplete: intake.mappingComplete,
      })
    } catch (err) {
      if (isBoreholeSchemaMissingError(err)) throw err
      console.error('[survey123/boreholes]', err)
      return Response.json({ error: 'Failed to store intake.' }, { status: 500 })
    }
  })
}
