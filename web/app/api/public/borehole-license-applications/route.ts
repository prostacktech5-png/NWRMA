import {
  createLicenseApplicationFromWaterDrillingForm,
  newLicenseApplicationId,
} from '@/lib/borehole-license-application'
import { notifyApplicantApplicationReceived } from '@/lib/borehole-license-notify'
import {
  ALL_DOCUMENT_SLOT_IDS,
  REQUIRED_DOCUMENT_SLOTS,
  type DocumentSlotId,
} from '@/lib/borehole-licensing-documents'
import {
  isAllowedLicenseMime,
  MAX_LICENSE_FILE_BYTES,
  newLicenseFileId,
  saveLicenseFileFromBuffer,
} from '@/lib/borehole-license-file-store'
import { tryRespondWithDbSetupHint } from '@/lib/db'
import { syncLicenseApplicationsFromErp } from '@/lib/db/license-application-persistence'
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
import { waterDrillingLicenceFormSchema } from '@/lib/nwrma-site/online-forms/water-drilling-licence-schema'
import { parsePublicMultipartRequest } from '@/lib/parse-public-multipart-request'
import type { LicenseApplicationDocumentMeta } from '@/lib/types'

function isDocumentSlotId(value: string): value is DocumentSlotId {
  return (ALL_DOCUMENT_SLOT_IDS as string[]).includes(value)
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

  const parsed = waterDrillingLicenceFormSchema.safeParse(parsedJson)
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

  const applicationId = newLicenseApplicationId()

  return tryRespondWithDbSetupHint(async () => {
    let payload = await loadOrSeedErpReferencePayload()
    const intakeCheck = validatePaymentIntakeForSubmit(
      payload,
      'water-drilling-licence',
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
    const documents = {} as Record<DocumentSlotId, LicenseApplicationDocumentMeta[]>
    for (const id of ALL_DOCUMENT_SLOT_IDS) {
      documents[id] = []
    }

    for (const slot of REQUIRED_DOCUMENT_SLOTS) {
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
        const meta = await saveLicenseFileFromBuffer({
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
      if (!isDocumentSlotId(slotId)) continue
      if (REQUIRED_DOCUMENT_SLOTS.some((s) => s.id === slotId)) continue
      if (isBankReceiptSlot(slotId)) continue
      if (value.size === 0) continue
      const mime = value.type || 'application/octet-stream'
      if (!isAllowedLicenseMime(mime)) continue
      const buffer = Buffer.from(await value.arrayBuffer())
      const fileId = newLicenseFileId()
      const meta = await saveLicenseFileFromBuffer({
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
      'water-drilling-licence',
      applicationId,
      intake
    )
    if (receiptMeta) {
      documents.bankReceipt = [receiptMeta]
    }

    const app = createLicenseApplicationFromWaterDrillingForm({
      form: parsed.data,
      documents,
      existing: payload.licenseApplications ?? [],
      applicationId,
    })

    payload.licenseApplications = [...(payload.licenseApplications ?? []), app]
    payload = linkIntakeToApplication(payload, intake.id, app.id)
    await saveErpReferencePayload(payload)
    await syncLicenseApplicationsFromErp()

    let emailWarning: string | undefined
    try {
      await notifyApplicantApplicationReceived(app)
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
