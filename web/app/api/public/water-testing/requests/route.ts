import { z } from 'zod'
import { tryRespondWithDbSetupHint, isPostgresUndefinedRelationError } from '@/lib/db'
import { createWaterTestingRequest } from '@/lib/db/water-testing-persistence'
import { notifyWaterTestingReceived } from '@/lib/water-testing-notify'
import { authorizeWaterTestingPublicRequest } from '@/lib/water-testing-api-key'

const createSchema = z.object({
  requesterName: z.string().min(1).max(200),
  requesterEmail: z.string().email().max(320),
  organisation: z.string().min(1).max(300),
  siteAddress: z.string().min(1).max(500),
  testsRequested: z.array(z.string().min(1).max(120)).min(1).max(50),
  priority: z.enum(['normal', 'urgent', 'critical']).optional(),
  phone: z.string().max(40).optional(),
  notes: z.string().max(2000).optional(),
  publicCaseId: z.string().max(120).optional(),
})

export async function POST(req: Request) {
  const auth = authorizeWaterTestingPublicRequest(req)
  if (!auth.authorized) {
    return Response.json({ error: auth.reason }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  return tryRespondWithDbSetupHint(async () => {
    let emailWarning: string | undefined
    try {
      const row = await createWaterTestingRequest({
        requesterName: parsed.data.requesterName,
        requesterEmail: parsed.data.requesterEmail,
        requesterPhone: parsed.data.phone ?? null,
        organisation: parsed.data.organisation,
        siteAddress: parsed.data.siteAddress,
        testsRequested: parsed.data.testsRequested,
        priority: parsed.data.priority,
        notes: parsed.data.notes ?? null,
        publicCaseId: parsed.data.publicCaseId ?? null,
      })

      try {
        await notifyWaterTestingReceived(row)
      } catch (e) {
        emailWarning =
          e instanceof Error
            ? e.message
            : 'Request saved but notification email could not be sent.'
      }

      return Response.json(
        {
          ok: true,
          id: row.id,
          reference: row.reference,
          status: row.status,
          emailWarning,
        },
        { status: 201 },
      )
    } catch (e) {
      if (isPostgresUndefinedRelationError(e)) throw e
      throw e
    }
  })
}
