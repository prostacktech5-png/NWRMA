import { tryRespondWithDbSetupHint } from '@/lib/db'
import { mutateErpReferencePayload } from '@/lib/db/reference-data-persistence'
import { verifyFormResumeToken } from '@/lib/form-resume-token'
import { intakeRequiresNewPayment } from '@/lib/online-form-linked-application'
import {
  findPaymentIntake,
  intakeToStatusResponse,
  redeemPaymentIntakeResumeLink,
} from '@/lib/online-form-payment-intake'

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const resume =
    body && typeof body === 'object' && typeof (body as { resume?: unknown }).resume === 'string'
      ? (body as { resume: string }).resume.trim()
      : ''

  if (!resume) {
    return Response.json({ error: 'Missing resume token.' }, { status: 400 })
  }

  const tokenPayload = verifyFormResumeToken(resume)
  if (!tokenPayload) {
    return Response.json({ error: 'Invalid or expired resume link.' }, { status: 400 })
  }

  return tryRespondWithDbSetupHint(async () => {
    let sessionToken!: string
    let updatedIntakeId = tokenPayload.intakeId
    let payload!: Awaited<ReturnType<typeof mutateErpReferencePayload>>

    try {
      payload = await mutateErpReferencePayload((payload) => {
        const intake = findPaymentIntake(payload, tokenPayload.intakeId)
        if (!intake) {
          throw new Error('PAYMENT_INTAKE_NOT_FOUND')
        }
        const redeemed = redeemPaymentIntakeResumeLink(payload, intake, resume)
        if ('error' in redeemed) {
          throw new Error(redeemed.error)
        }
        sessionToken = redeemed.sessionToken
        updatedIntakeId = intake.id
        return redeemed.payload
      })
    } catch (e) {
      if (e instanceof Error) {
        if (e.message === 'PAYMENT_INTAKE_NOT_FOUND') {
          return Response.json({ error: 'Payment intake not found.' }, { status: 404 })
        }
        return Response.json({ error: e.message }, { status: 403 })
      }
      throw e
    }

    const updated = findPaymentIntake(payload, updatedIntakeId)
    if (!updated) {
      return Response.json({ error: 'Payment intake not found.' }, { status: 404 })
    }

    const recycle = intakeRequiresNewPayment(payload, updated)
    if (recycle.required) {
      return Response.json(
        {
          ...intakeToStatusResponse(updated, false, {
            requiresNewPayment: true,
            paymentBlockedMessage: recycle.message ?? null,
            linkedApplicationReference: recycle.applicationReference ?? null,
            linkedApplicationStatus: recycle.applicationStatus ?? null,
          }),
        },
        { status: 403 }
      )
    }

    return Response.json({
      ...intakeToStatusResponse(updated, true),
      sessionToken,
    })
  })
}
