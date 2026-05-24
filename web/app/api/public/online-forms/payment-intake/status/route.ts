import { tryRespondWithDbSetupHint } from '@/lib/db'
import { loadOrSeedErpReferencePayload } from '@/lib/db/reference-data-persistence'
import { verifyFormResumeToken } from '@/lib/form-resume-token'
import { intakeRequiresNewPayment } from '@/lib/online-form-linked-application'
import {
  findPaymentIntake,
  getIntakeValidationStatus,
  intakeToStatusResponse,
  previewIntakeResumeToken,
} from '@/lib/online-form-payment-intake'

function statusExtras(
  payload: Awaited<ReturnType<typeof loadOrSeedErpReferencePayload>>,
  intake: NonNullable<ReturnType<typeof findPaymentIntake>>
) {
  const recycle = intakeRequiresNewPayment(payload, intake)
  if (!recycle.required) return {}
  return {
    requiresNewPayment: true,
    paymentBlockedMessage: recycle.message ?? null,
    linkedApplicationReference: recycle.applicationReference ?? null,
    linkedApplicationStatus: recycle.applicationStatus ?? null,
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const intakeId = searchParams.get('intakeId')?.trim() ?? ''
  const resume = searchParams.get('resume')?.trim() ?? ''

  if (!intakeId && !resume) {
    return Response.json({ error: 'Provide intakeId or resume token.' }, { status: 400 })
  }

  return tryRespondWithDbSetupHint(async () => {
    const payload = await loadOrSeedErpReferencePayload({ syncRegistry: false })
    let resolvedId = intakeId

    if (resume) {
      const tokenPayload = verifyFormResumeToken(resume)
      if (!tokenPayload) {
        return Response.json({ error: 'Invalid or expired resume link.' }, { status: 400 })
      }
      resolvedId = tokenPayload.intakeId
    }

    const intake = findPaymentIntake(payload, resolvedId)
    if (!intake) {
      return Response.json({ error: 'Payment intake not found.' }, { status: 404 })
    }

    const status = getIntakeValidationStatus(intake.bankReceiptValidation)
    const extras = statusExtras(payload, intake)

    if (extras.requiresNewPayment) {
      return Response.json(
        intakeToStatusResponse(intake, false, extras)
      )
    }

    if (resume && status === 'validated') {
      const preview = previewIntakeResumeToken(intake, resume)
      if (!preview.ok) {
        return Response.json(
          { ...intakeToStatusResponse(intake, false, extras), error: preview.error },
          { status: 403 }
        )
      }

      if (preview.mode === 'session_active') {
        return Response.json({
          ...intakeToStatusResponse(intake, true, extras),
          sessionToken: resume,
        })
      }

      return Response.json({
        ...intakeToStatusResponse(intake, false, extras),
        needsRedeem: true,
      })
    }

    return Response.json(intakeToStatusResponse(intake, false, extras))
  })
}
