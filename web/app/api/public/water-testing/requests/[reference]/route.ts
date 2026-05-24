import { tryRespondWithDbSetupHint } from '@/lib/db'
import { getWaterTestingRequestByReference } from '@/lib/db/water-testing-persistence'
import { authorizeWaterTestingPublicRequest } from '@/lib/water-testing-api-key'

export async function GET(
  req: Request,
  ctx: { params: Promise<{ reference: string }> },
) {
  const auth = authorizeWaterTestingPublicRequest(req)
  if (!auth.authorized) {
    return Response.json({ error: auth.reason }, { status: 401 })
  }

  const { reference } = await ctx.params
  const ref = reference?.trim()
  if (!ref) {
    return Response.json({ error: 'Invalid reference.' }, { status: 400 })
  }

  return tryRespondWithDbSetupHint(async () => {
    const row = await getWaterTestingRequestByReference(ref)
    if (!row) {
      return Response.json({ error: 'Request not found.' }, { status: 404 })
    }

    return Response.json({
      ok: true,
      reference: row.reference,
      status: row.status,
      requesterName: row.requesterName,
      organisation: row.organisation,
      siteAddress: row.siteAddress,
      testsRequested: row.testsRequested,
      sampleCollectionScheduledAt: row.sampleCollectionScheduledAt?.toISOString() ?? null,
      completedAt: row.completedAt?.toISOString() ?? null,
      results: row.status === 'completed' ? row.results : null,
      receivedAt: row.receivedAt.toISOString(),
    })
  })
}
