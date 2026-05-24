import { tryRespondWithDbSetupHint } from '@/lib/db'
import { mutateErpReferencePayload } from '@/lib/db/reference-data-persistence'
import {
  canAccessBankReceiptValidationDeskAsync,
  findBankReceiptQueueItem,
} from '@/lib/bank-receipt-validation-desk'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import {
  findPaymentIntake,
  intakeToQueueItem,
  issueResumeTokenForIntake,
  nextFinanceReceiptNumber,
  patchIntakeInPayload,
} from '@/lib/online-form-payment-intake'
import {
  notifyPaymentIntakeApproved,
  notifyPaymentIntakeRejected,
} from '@/lib/online-form-payment-notify'
import type { BankReceiptValidationStatus } from '@/lib/types'

const ALLOWED: BankReceiptValidationStatus[] = ['validated', 'rejected']

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ intakeId: string }> }
) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) {
      return Response.json(
        { error: 'Send X-Acting-User-Id to identify the ERP user (demo auth).' },
        { status: 401 }
      )
    }
    if (!(await canAccessBankReceiptValidationDeskAsync(viewer))) {
      return Response.json(
        { error: 'Only Finance staff or administrators can validate bank receipts.' },
        { status: 403 }
      )
    }

    const { intakeId } = await ctx.params
    if (!intakeId?.trim()) {
      return Response.json({ error: 'Invalid intake id.' }, { status: 400 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const status =
      body && typeof body === 'object' && typeof (body as { status?: unknown }).status === 'string'
        ? (body as { status: string }).status
        : null

    if (!status || !ALLOWED.includes(status as BankReceiptValidationStatus)) {
      return Response.json(
        { error: 'Invalid status. Use validated or rejected.' },
        { status: 400 }
      )
    }

    const note =
      body &&
      typeof body === 'object' &&
      typeof (body as { note?: unknown }).note === 'string'
        ? (body as { note: string }).note.trim() || null
        : null

    if (status === 'rejected' && !note) {
      return Response.json(
        { error: 'A comment is required when rejecting a receipt.' },
        { status: 400 }
      )
    }

    let validation = {
      status: status as BankReceiptValidationStatus,
      validatedAt: new Date(),
      validatedBy: viewer.id,
      validatedByName: viewer.name,
      note: status === 'rejected' ? note : note ?? null,
      receiptNumber: null as string | null,
    }

    let resumeTokenRaw: string | undefined
    let updated!: NonNullable<ReturnType<typeof findPaymentIntake>>

    try {
      await mutateErpReferencePayload((payload) => {
        const intake = findPaymentIntake(payload, intakeId)
        if (!intake) {
          throw new Error('PAYMENT_INTAKE_NOT_FOUND')
        }

        let patch: Parameters<typeof patchIntakeInPayload>[2] = {}

        if (status === 'validated') {
          const receiptNumber = nextFinanceReceiptNumber(payload.onlineFormPaymentIntakes ?? [])
          validation = { ...validation, receiptNumber }
          const issued = issueResumeTokenForIntake(intake)
          resumeTokenRaw = issued.rawToken
          patch = {
            ...patch,
            bankReceiptValidation: validation,
            resumeTokenHash: issued.hash,
            resumeTokenExpiresAt: issued.expiresAt,
          }
        } else {
          patch = {
            bankReceiptValidation: validation,
            resumeTokenHash: null,
            resumeTokenExpiresAt: null,
          }
        }

        const next = patchIntakeInPayload(payload, intakeId, patch)
        updated = findPaymentIntake(next, intakeId)!
        return next
      })
    } catch (e) {
      if (e instanceof Error && e.message === 'PAYMENT_INTAKE_NOT_FOUND') {
        return Response.json({ error: 'Payment intake not found.' }, { status: 404 })
      }
      throw e
    }

    let emailWarning: string | undefined
    try {
      if (status === 'validated' && resumeTokenRaw) {
        await notifyPaymentIntakeApproved(updated, resumeTokenRaw)
      } else if (status === 'rejected' && note) {
        await notifyPaymentIntakeRejected(updated, note)
      }
    } catch (e) {
      emailWarning =
        e instanceof Error ? e.message : 'Status saved but notification email could not be sent.'
    }

    return Response.json({
      ok: true,
      validation: updated.bankReceiptValidation,
      receiptNumber: updated.bankReceiptValidation?.receiptNumber ?? null,
      item: intakeToQueueItem(updated),
      emailWarning,
    })
  })
}
