import { tryRespondWithDbSetupHint } from '@/lib/db'
import {
  loadOrSeedErpReferencePayload,
  saveErpReferencePayload,
} from '@/lib/db/reference-data-persistence'
import {
  canReviewDamSafetyApplications,
  isReviewableDamSafetyStatus,
} from '@/lib/dam-safety-application'
import { additionalInfoRequestPayload } from '@/lib/application-amendment'
import { notifyDamSafetyApplicantForStatus } from '@/lib/dam-safety-notify'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import type { DamSafetyApplicationStatus } from '@/lib/types'

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) {
      return Response.json(
        { error: 'Send X-Acting-User-Id to identify the ERP user (demo auth).' },
        { status: 401 }
      )
    }
    if (!canReviewDamSafetyApplications(viewer)) {
      return Response.json(
        {
          error:
            'Only Hydrological Application processing unit staff, Compliance staff, or administrators can review dam safety applications.',
        },
        { status: 403 }
      )
    }

    const { id } = await ctx.params
    if (!id?.trim()) {
      return Response.json({ error: 'Invalid application id.' }, { status: 400 })
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

    const reviewNote =
      body &&
      typeof body === 'object' &&
      typeof (body as { reviewNote?: unknown }).reviewNote === 'string'
        ? (body as { reviewNote: string }).reviewNote.trim() || null
        : null

    if (status && !isReviewableDamSafetyStatus(status)) {
      return Response.json(
        {
          error:
            'Invalid status. Use under_review, approved, rejected, or additional_info_required.',
        },
        { status: 400 }
      )
    }

    if (!status && reviewNote === null) {
      return Response.json({ error: 'No updates provided.' }, { status: 400 })
    }

    const payload = await loadOrSeedErpReferencePayload()
    const applications = payload.damSafetyApplications ?? []
    const index = applications.findIndex((a) => a.id === id)
    if (index < 0) {
      return Response.json({ error: 'Application not found.' }, { status: 404 })
    }

    const existing = applications[index]

    if (status === 'additional_info_required' && !reviewNote) {
      return Response.json(
        {
          error:
            'Describe the missing information in the request dialog before sending to the applicant.',
        },
        { status: 400 }
      )
    }

    let amendUrl: string | undefined
    let additionalPatch: Record<string, unknown> = {}
    if (status === 'additional_info_required' && reviewNote) {
      const issued = additionalInfoRequestPayload('dam-safety', id, existing, reviewNote)
      additionalPatch = issued.patch
      amendUrl = issued.amendUrl
    }

    let updated = {
      ...existing,
      ...additionalPatch,
      status: status ? (status as DamSafetyApplicationStatus) : existing.status,
      reviewNote:
        status === 'additional_info_required' && reviewNote
          ? reviewNote
          : reviewNote !== null
            ? reviewNote
            : existing.reviewNote ?? null,
      reviewedAt: new Date(),
    }

    const damSafetyApplications = [...applications]
    damSafetyApplications[index] = updated

    await saveErpReferencePayload({
      ...payload,
      damSafetyApplications,
    })

    let emailWarning: string | undefined
    if (
      status === 'additional_info_required' ||
      status === 'approved' ||
      status === 'rejected'
    ) {
      try {
        await notifyDamSafetyApplicantForStatus(updated, status, { amendUrl })
        updated = { ...updated, lastEmailSentAt: new Date() }
        damSafetyApplications[index] = updated
        await saveErpReferencePayload({
          ...payload,
          damSafetyApplications,
        })
      } catch (e) {
        emailWarning =
          e instanceof Error
            ? e.message
            : 'Status saved but notification email could not be sent.'
      }
    }

    return Response.json({
      ok: true,
      application: updated,
      emailWarning,
    })
  })
}
