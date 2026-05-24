import {
  createEffluentDischargeApplicationFromForm,
  newEffluentDischargeApplicationId,
} from '@/lib/effluent-discharge-application'
import {
  ALL_EFFLUENT_DISCHARGE_SLOT_IDS,
  EFFLUENT_DISCHARGE_REQUIRED_SLOTS,
  type EffluentDischargeDocumentSlotId,
} from '@/lib/effluent-discharge-documents'
import {
  isAllowedLicenseMime,
  MAX_LICENSE_FILE_BYTES,
  newLicenseFileId,
  saveEffluentDischargeFileFromBuffer,
} from '@/lib/effluent-discharge-file-store'
import { notifyEffluentDischargeApplicationReceived } from '@/lib/effluent-discharge-notify'
import { tryRespondWithDbSetupHint } from '@/lib/db'
import {
  loadOrSeedErpReferencePayload,
  saveErpReferencePayload,
} from '@/lib/db/reference-data-persistence'
import {
  isBankReceiptSlot,
  linkIntakeToApplication,
  parsePaymentIntakeSubmitFields,
  saveIntakeBankReceiptOnApplication,
  validatePaymentIntakeForSubmit,
} from '@/lib/online-form-payment-intake-submit'
import { assertApplicationMatchesIntakeIdentity } from '@/lib/online-form-payment-intake'
import { effluentDischargeFormSchema } from '@/lib/nwrma-site/online-forms/effluent-discharge-schema'
import { parsePublicMultipartRequest } from '@/lib/parse-public-multipart-request'
import type { EffluentDischargeDocumentMeta } from '@/lib/types'

function isEffluentSlot(value: string): value is EffluentDischargeDocumentSlotId {
  return (ALL_EFFLUENT_DISCHARGE_SLOT_IDS as string[]).includes(value)
}

export async function POST(req: Request) {
  const parsedBody = await parsePublicMultipartRequest(req)
  if (parsedBody instanceof Response) return parsedBody
  const formData = parsedBody

  const applicationRaw = formData.get('application')
  if (typeof applicationRaw !== 'string') {
    return Response.json({ error: 'Missing application JSON field.' }, { status: 400 })
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(applicationRaw)
  } catch {
    return Response.json({ error: 'Invalid application JSON.' }, { status: 400 })
  }

  const parsed = effluentDischargeFormSchema.safeParse(parsedJson)
  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const intakeFields = parsePaymentIntakeSubmitFields(formData)
  if ('error' in intakeFields) {
    return Response.json({ error: intakeFields.error }, { status: 400 })
  }

  const applicationId = newEffluentDischargeApplicationId()

  return tryRespondWithDbSetupHint(async () => {
    let payload = await loadOrSeedErpReferencePayload()
    const intakeCheck = validatePaymentIntakeForSubmit(
      payload,
      'effluent-discharge',
      intakeFields.intakeId,
      intakeFields.resumeToken
    )
    if ('error' in intakeCheck) {
      return Response.json({ error: intakeCheck.error }, { status: 400 })
    }
    const { intake } = intakeCheck
    const identityErr = assertApplicationMatchesIntakeIdentity(
      intake,
      parsed.data.companyName,
      parsed.data.email
    )
    if (identityErr) {
      return Response.json({ error: identityErr }, { status: 400 })
    }
    const documents = {} as Record<EffluentDischargeDocumentSlotId, EffluentDischargeDocumentMeta[]>
    for (const id of ALL_EFFLUENT_DISCHARGE_SLOT_IDS) documents[id] = []

    for (const slot of EFFLUENT_DISCHARGE_REQUIRED_SLOTS) {
      const files = formData.getAll(`doc_${slot.id}`).filter((f): f is File => f instanceof File)
      for (const file of files) {
        if (file.size > MAX_LICENSE_FILE_BYTES) {
          return Response.json(
            { error: `File "${file.name}" exceeds 10 MB limit.` },
            { status: 400 }
          )
        }
        const mime = file.type || 'application/octet-stream'
        if (!isAllowedLicenseMime(mime)) {
          return Response.json(
            { error: `File type not allowed for "${file.name}". Use PDF, JPG, or PNG.` },
            { status: 400 }
          )
        }
        const buffer = Buffer.from(await file.arrayBuffer())
        const fileId = newLicenseFileId()
        const meta = await saveEffluentDischargeFileFromBuffer({
          applicationId,
          slotId: slot.id,
          fileId,
          originalName: file.name,
          mimeType: mime,
          buffer,
        })
        documents[slot.id].push(meta)
      }
      if (documents[slot.id].length === 0) {
        return Response.json(
          { error: `Missing required document: ${slot.label}` },
          { status: 400 }
        )
      }
    }

    for (const [key, value] of formData.entries()) {
      if (!key.startsWith('doc_') || !(value instanceof File)) continue
      const slotId = key.slice(4)
      if (!isEffluentSlot(slotId)) continue
      if (EFFLUENT_DISCHARGE_REQUIRED_SLOTS.some((s) => s.id === slotId)) continue
      if (isBankReceiptSlot(slotId)) continue
      if (value.size === 0) continue
      const mime = value.type || 'application/octet-stream'
      if (!isAllowedLicenseMime(mime)) continue
      const buffer = Buffer.from(await value.arrayBuffer())
      const fileId = newLicenseFileId()
      const meta = await saveEffluentDischargeFileFromBuffer({
        applicationId,
        slotId,
        fileId,
        originalName: value.name,
        mimeType: mime,
        buffer,
      })
      documents[slotId].push(meta)
    }

    const receiptMeta = await saveIntakeBankReceiptOnApplication(
      'effluent-discharge',
      applicationId,
      intake
    )
    if (receiptMeta) {
      documents.bankReceipt = [receiptMeta]
    }

    const app = createEffluentDischargeApplicationFromForm({
      form: parsed.data,
      documents,
      existing: payload.effluentDischargeApplications ?? [],
      applicationId,
    })

    payload.effluentDischargeApplications = [
      ...(payload.effluentDischargeApplications ?? []),
      app,
    ]
    payload = linkIntakeToApplication(payload, intake.id, app.id)
    await saveErpReferencePayload(payload)

    let emailWarning: string | undefined
    try {
      await notifyEffluentDischargeApplicationReceived(app)
    } catch (e) {
      emailWarning =
        e instanceof Error ? e.message : 'Application saved but notification email could not be sent.'
    }

    return Response.json(
      {
        ok: true,
        id: app.id,
        reference: app.reference,
        status: app.status,
        emailWarning,
      },
      { status: 201 }
    )
  })
}
