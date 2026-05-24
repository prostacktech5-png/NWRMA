import { tryRespondWithDbSetupHint } from '@/lib/db'
import { mutateErpReferencePayload } from '@/lib/db/reference-data-persistence'
import {
  validateApplicantGateFields,
  BANK_RECEIPT_SLOT_ID,
} from '@/lib/nwrma-site/online-forms/applicant-gate'
import {
  createPendingIntake,
  isOnlineFormSlug,
  newPaymentIntakeId,
} from '@/lib/online-form-payment-intake'
import { savePaymentIntakeReceiptFromBuffer } from '@/lib/online-form-payment-intake-file-store'
import { parsePublicMultipartRequest } from '@/lib/parse-public-multipart-request'
import type { OnlineFormPaymentIntakeAcknowledgements } from '@/lib/types'

export async function POST(req: Request) {
  const parsedBody = await parsePublicMultipartRequest(req)
  if (parsedBody instanceof Response) return parsedBody
  const formData = parsedBody

  const formSlug = String(formData.get('formSlug') ?? '').trim()
  if (!isOnlineFormSlug(formSlug)) {
    return Response.json({ error: 'Invalid form slug.' }, { status: 400 })
  }

  const fields = {
    organizationName: String(formData.get('organizationName') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    contactPersonName: String(formData.get('contactPersonName') ?? ''),
  }

  const receiptFiles = formData
    .getAll(`doc_${BANK_RECEIPT_SLOT_ID}`)
    .filter((f): f is File => f instanceof File && f.size > 0)
  const bankReceipt = receiptFiles[0] ?? null

  const fieldErr = validateApplicantGateFields(fields, bankReceipt)
  if (fieldErr) {
    return Response.json({ error: fieldErr }, { status: 400 })
  }

  let acknowledgements: OnlineFormPaymentIntakeAcknowledgements
  const ackRaw = formData.get('acknowledgements')
  if (typeof ackRaw !== 'string') {
    return Response.json({ error: 'Missing acknowledgements.' }, { status: 400 })
  }
  try {
    const parsed = JSON.parse(ackRaw) as OnlineFormPaymentIntakeAcknowledgements
    if (!parsed.readInstructions || !parsed.feesUnderstood) {
      return Response.json({ error: 'Please confirm the instruction checkboxes.' }, { status: 400 })
    }
    acknowledgements = parsed
  } catch {
    return Response.json({ error: 'Invalid acknowledgements JSON.' }, { status: 400 })
  }

  return tryRespondWithDbSetupHint(async () => {
    const intakeId = newPaymentIntakeId()
    const mime = bankReceipt!.type || 'application/octet-stream'
    const buffer = Buffer.from(await bankReceipt!.arrayBuffer())
    const receiptFile = await savePaymentIntakeReceiptFromBuffer({
      intakeId,
      originalName: bankReceipt!.name,
      mimeType: mime,
      buffer,
    })

    let intake!: ReturnType<typeof createPendingIntake>
    await mutateErpReferencePayload((payload) => {
      const existing = payload.onlineFormPaymentIntakes ?? []
      intake = createPendingIntake({
        formSlug,
        fields,
        acknowledgements,
        receiptFile,
        existing,
        intakeId,
      })
      payload.onlineFormPaymentIntakes = [...existing, intake]
      return payload
    })

    return Response.json({
      ok: true,
      intakeId: intake.id,
      intakeReference: intake.intakeReference,
      status: 'pending',
      email: intake.email,
      organisationName: intake.organisationName,
      phone: intake.phone,
      contactPersonName: intake.contactPersonName,
    })
  })
}
