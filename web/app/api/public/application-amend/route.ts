import {
  clearValuesAtPaths,
  findApplicationInPayload,
  verifyApplicationAmendToken,
  verifyApplicationAmendmentAccess,
  type ApplicationAmendFormSlug,
} from '@/lib/application-amendment'
import {
  resubmitDamSafetyApplication,
  resubmitEffluentApplication,
  resubmitWaterDrillingApplication,
  resubmitWaterRightApplication,
  summarizeExistingDocuments,
} from '@/lib/application-amend-resubmit'
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
import { DAM_SAFETY_REQUIRED_SLOTS } from '@/lib/dam-safety-documents'
import { newLicenseFileId as newDamFileId, saveDamSafetyFileFromBuffer } from '@/lib/dam-safety-file-store'
import { EFFLUENT_DISCHARGE_REQUIRED_SLOTS } from '@/lib/effluent-discharge-documents'
import { saveEffluentDischargeFileFromBuffer } from '@/lib/effluent-discharge-file-store'
import { WATER_RIGHT_REQUIRED_SLOTS } from '@/lib/water-right-documents'
import { saveWaterRightFileFromBuffer } from '@/lib/water-right-file-store'
import { tryRespondWithDbSetupHint } from '@/lib/db'
import { syncLicenseApplicationsFromErp } from '@/lib/db/license-application-persistence'
import {
  loadOrSeedErpReferencePayload,
  saveErpReferencePayload,
} from '@/lib/db/reference-data-persistence'
import { waterDrillingLicenceFormSchema } from '@/lib/nwrma-site/online-forms/water-drilling-licence-schema'
import { damSafetyFormSchema } from '@/lib/nwrma-site/online-forms/dam-safety-schema'
import { effluentDischargeFormSchema } from '@/lib/nwrma-site/online-forms/effluent-discharge-schema'
import { waterRightFormSchema } from '@/lib/nwrma-site/online-forms/water-right-schema'
import { parsePublicMultipartRequest } from '@/lib/parse-public-multipart-request'
import type {
  BoreholeLicenseApplication,
  LicenseApplicationDocumentMeta,
} from '@/lib/types'

function isLicenseSlot(value: string): value is DocumentSlotId {
  return (ALL_DOCUMENT_SLOT_IDS as string[]).includes(value)
}

export async function GET(req: Request) {
  const amend = new URL(req.url).searchParams.get('amend')?.trim() ?? ''
  if (!amend) {
    return Response.json({ error: 'Missing amend token.' }, { status: 400 })
  }

  const tokenPayload = verifyApplicationAmendToken(amend)
  if (!tokenPayload) {
    return Response.json({ error: 'Invalid or expired amendment link.' }, { status: 400 })
  }

  return tryRespondWithDbSetupHint(async () => {
    const payload = await loadOrSeedErpReferencePayload({ syncRegistry: false })
    const found = findApplicationInPayload(
      payload,
      tokenPayload.formSlug,
      tokenPayload.applicationId
    )
    if (!found) {
      return Response.json({ error: 'Application not found.' }, { status: 404 })
    }

    const app = found.application
    const access = verifyApplicationAmendmentAccess(app, amend)
    if (!access.ok) {
      return Response.json({ error: access.error }, { status: 403 })
    }

    const clearPaths = app.amendmentClearPaths ?? []
    let form: Record<string, unknown> | null = null

    switch (found.formSlug) {
      case 'water-drilling-licence': {
        const ext = found.application.extendedForm
        if (!ext) return Response.json({ error: 'Form data missing.' }, { status: 404 })
        form = clearValuesAtPaths(ext, clearPaths) as Record<string, unknown>
        break
      }
      case 'dam-safety': {
        const ext = found.application.extendedForm
        if (!ext) return Response.json({ error: 'Form data missing.' }, { status: 404 })
        form = clearValuesAtPaths(ext, clearPaths) as Record<string, unknown>
        break
      }
      case 'effluent-discharge': {
        const ext = found.application.extendedForm
        if (!ext) return Response.json({ error: 'Form data missing.' }, { status: 404 })
        form = clearValuesAtPaths(ext, clearPaths) as Record<string, unknown>
        break
      }
      case 'water-right': {
        const ext = found.application.extendedForm
        if (!ext) return Response.json({ error: 'Form data missing.' }, { status: 404 })
        form = clearValuesAtPaths(ext, clearPaths) as Record<string, unknown>
        break
      }
    }

    return Response.json({
      ok: true,
      formSlug: found.formSlug,
      applicationId: app.id,
      reference: app.reference,
      reviewNote: app.reviewNote ?? null,
      form,
      existingDocuments: summarizeExistingDocuments(
        app.documents as Record<string, { id: string; name: string }[]>
      ),
    })
  })
}

async function mergeWaterDrillingDocuments(
  applicationId: string,
  existing: BoreholeLicenseApplication['documents'],
  formData: FormData
): Promise<BoreholeLicenseApplication['documents'] | { error: string }> {
  const documents = { ...existing }
  for (const slot of REQUIRED_DOCUMENT_SLOTS) {
    const incoming = formData
      .getAll(`doc_${slot.id}`)
      .filter((f): f is File => f instanceof File && f.size > 0)
    if (incoming.length > 0) {
      documents[slot.id] = []
      for (const file of incoming) {
        if (file.size > MAX_LICENSE_FILE_BYTES) {
          return { error: `File "${file.name}" exceeds 10 MB limit.` }
        }
        const mime = file.type || 'application/octet-stream'
        if (!isAllowedLicenseMime(mime)) {
          return { error: `File type not allowed for "${file.name}".` }
        }
        const buffer = Buffer.from(await file.arrayBuffer())
        const meta = await saveLicenseFileFromBuffer({
          applicationId,
          slotId: slot.id,
          fileId: newLicenseFileId(),
          originalName: file.name,
          mimeType: mime,
          buffer,
        })
        documents[slot.id].push(meta)
      }
    }
    if ((documents[slot.id]?.length ?? 0) === 0) {
      return { error: `Missing required document: ${slot.label}` }
    }
  }

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith('doc_') || !(value instanceof File) || value.size === 0) continue
    const slotId = key.slice(4)
    if (!isLicenseSlot(slotId)) continue
    if (REQUIRED_DOCUMENT_SLOTS.some((s) => s.id === slotId)) continue
    const mime = value.type || 'application/octet-stream'
    if (!isAllowedLicenseMime(mime)) continue
    const buffer = Buffer.from(await value.arrayBuffer())
    const meta = await saveLicenseFileFromBuffer({
      applicationId,
      slotId,
      fileId: newLicenseFileId(),
      originalName: value.name,
      mimeType: mime,
      buffer,
    })
    if (!documents[slotId]) documents[slotId] = []
    documents[slotId].push(meta)
  }

  return documents
}

export async function POST(req: Request) {
  const parsedBody = await parsePublicMultipartRequest(req)
  if (parsedBody instanceof Response) return parsedBody
  const formData = parsedBody

  const amend = String(formData.get('amend') ?? '').trim()
  if (!amend) {
    return Response.json({ error: 'Missing amend token.' }, { status: 400 })
  }

  const tokenPayload = verifyApplicationAmendToken(amend)
  if (!tokenPayload) {
    return Response.json({ error: 'Invalid or expired amendment link.' }, { status: 400 })
  }

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

  return tryRespondWithDbSetupHint(async () => {
    let payload = await loadOrSeedErpReferencePayload()
    const found = findApplicationInPayload(
      payload,
      tokenPayload.formSlug,
      tokenPayload.applicationId
    )
    if (!found) {
      return Response.json({ error: 'Application not found.' }, { status: 404 })
    }

    const access = verifyApplicationAmendmentAccess(found.application, amend)
    if (!access.ok) {
      return Response.json({ error: access.error }, { status: 403 })
    }

    const formSlug = tokenPayload.formSlug as ApplicationAmendFormSlug

    if (formSlug === 'water-drilling-licence') {
      const parsed = waterDrillingLicenceFormSchema.safeParse(parsedJson)
      if (!parsed.success) {
        return Response.json(
          { error: 'Validation failed', details: parsed.error.flatten() },
          { status: 400 }
        )
      }
      const app = found.application
      const docs = await mergeWaterDrillingDocuments(app.id, app.documents, formData)
      if ('error' in docs) {
        return Response.json({ error: docs.error }, { status: 400 })
      }
      const updated = resubmitWaterDrillingApplication(app, parsed.data, docs)
      const index = payload.licenseApplications.findIndex((a) => a.id === app.id)
      const licenseApplications = [...payload.licenseApplications]
      licenseApplications[index] = updated
      payload = { ...payload, licenseApplications }
      await saveErpReferencePayload(payload)
      await syncLicenseApplicationsFromErp()
      return Response.json({
        ok: true,
        reference: updated.reference,
        status: updated.status,
      })
    }

    // Other form types: validate, merge docs similarly, resubmit
    if (formSlug === 'dam-safety') {
      const parsed = damSafetyFormSchema.safeParse(parsedJson)
      if (!parsed.success) {
        return Response.json(
          { error: 'Validation failed', details: parsed.error.flatten() },
          { status: 400 }
        )
      }
      const app = found.application
      const documents = { ...app.documents }
      for (const slot of DAM_SAFETY_REQUIRED_SLOTS) {
        const incoming = formData
          .getAll(`doc_${slot.id}`)
          .filter((f): f is File => f instanceof File && f.size > 0)
        if (incoming.length > 0) {
          documents[slot.id] = []
          for (const file of incoming) {
            const buffer = Buffer.from(await file.arrayBuffer())
            const meta = await saveDamSafetyFileFromBuffer({
              applicationId: app.id,
              slotId: slot.id,
              fileId: newDamFileId(),
              originalName: file.name,
              mimeType: file.type || 'application/octet-stream',
              buffer,
            })
            documents[slot.id].push(meta)
          }
        }
        if ((documents[slot.id]?.length ?? 0) === 0) {
          return Response.json({ error: `Missing required document: ${slot.label}` }, { status: 400 })
        }
      }
      const updated = resubmitDamSafetyApplication(app, parsed.data, documents)
      const index = payload.damSafetyApplications.findIndex((a) => a.id === app.id)
      const damSafetyApplications = [...payload.damSafetyApplications]
      damSafetyApplications[index] = updated
      await saveErpReferencePayload({ ...payload, damSafetyApplications })
      return Response.json({ ok: true, reference: updated.reference, status: updated.status })
    }

    if (formSlug === 'effluent-discharge') {
      const parsed = effluentDischargeFormSchema.safeParse(parsedJson)
      if (!parsed.success) {
        return Response.json(
          { error: 'Validation failed', details: parsed.error.flatten() },
          { status: 400 }
        )
      }
      const app = found.application
      const documents = { ...app.documents }
      for (const slot of EFFLUENT_DISCHARGE_REQUIRED_SLOTS) {
        const incoming = formData
          .getAll(`doc_${slot.id}`)
          .filter((f): f is File => f instanceof File && f.size > 0)
        if (incoming.length > 0) {
          documents[slot.id] = []
          for (const file of incoming) {
            const buffer = Buffer.from(await file.arrayBuffer())
            const meta = await saveEffluentDischargeFileFromBuffer({
              applicationId: app.id,
              slotId: slot.id,
              fileId: newLicenseFileId(),
              originalName: file.name,
              mimeType: file.type || 'application/octet-stream',
              buffer,
            })
            documents[slot.id].push(meta)
          }
        }
        if ((documents[slot.id]?.length ?? 0) === 0) {
          return Response.json({ error: `Missing required document: ${slot.label}` }, { status: 400 })
        }
      }
      const updated = resubmitEffluentApplication(app, parsed.data, documents)
      const index = payload.effluentDischargeApplications.findIndex((a) => a.id === app.id)
      const effluentDischargeApplications = [...payload.effluentDischargeApplications]
      effluentDischargeApplications[index] = updated
      await saveErpReferencePayload({ ...payload, effluentDischargeApplications })
      return Response.json({ ok: true, reference: updated.reference, status: updated.status })
    }

    if (formSlug === 'water-right') {
      const parsed = waterRightFormSchema.safeParse(parsedJson)
      if (!parsed.success) {
        return Response.json(
          { error: 'Validation failed', details: parsed.error.flatten() },
          { status: 400 }
        )
      }
      const app = found.application
      const documents = { ...app.documents }
      for (const slot of WATER_RIGHT_REQUIRED_SLOTS) {
        const incoming = formData
          .getAll(`doc_${slot.id}`)
          .filter((f): f is File => f instanceof File && f.size > 0)
        if (incoming.length > 0) {
          documents[slot.id] = []
          for (const file of incoming) {
            const buffer = Buffer.from(await file.arrayBuffer())
            const meta = await saveWaterRightFileFromBuffer({
              applicationId: app.id,
              slotId: slot.id,
              fileId: newLicenseFileId(),
              originalName: file.name,
              mimeType: file.type || 'application/octet-stream',
              buffer,
            })
            documents[slot.id].push(meta)
          }
        }
        if ((documents[slot.id]?.length ?? 0) === 0) {
          return Response.json({ error: `Missing required document: ${slot.label}` }, { status: 400 })
        }
      }
      const updated = resubmitWaterRightApplication(app, parsed.data, documents)
      const index = payload.waterRightApplications.findIndex((a) => a.id === app.id)
      const waterRightApplications = [...payload.waterRightApplications]
      waterRightApplications[index] = updated
      await saveErpReferencePayload({ ...payload, waterRightApplications })
      return Response.json({ ok: true, reference: updated.reference, status: updated.status })
    }

    return Response.json({ error: 'Unsupported form.' }, { status: 400 })
  })
}
