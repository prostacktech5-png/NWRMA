import { tryRespondWithDbSetupHint } from '@/lib/db'
import {
  loadOrSeedErpReferencePayload,
  saveErpReferencePayload,
} from '@/lib/db/reference-data-persistence'
import {
  canReviewWaterRightApplications,
  isReviewableWaterRightStatus,
} from '@/lib/water-right-application'
import { notifyWaterRightApplicantForStatus } from '@/lib/water-right-notify'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import type { WaterRightApplicationStatus } from '@/lib/types'

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) {
      return Response.json(
        { error: 'Send X-Acting-User-Id to identify the ERP user (demo auth).' },
        { status: 401 }
      )
    }
    if (!canReviewWaterRightApplications(viewer)) {
      return Response.json(
        {
          error:
            'Only Hydrological Application processing unit staff, Compliance staff, or administrators can review water right applications.',
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

    if (status && !isReviewableWaterRightStatus(status)) {
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
    const applications = payload.waterRightApplications ?? []
    const index = applications.findIndex((a) => a.id === id)
    if (index < 0) {
      return Response.json({ error: 'Application not found.' }, { status: 404 })
    }

    const existing = applications[index]
    let updated = {
      ...existing,
      status: status ? (status as WaterRightApplicationStatus) : existing.status,
      reviewNote: reviewNote !== null ? reviewNote : existing.reviewNote ?? null,
      reviewedAt: new Date(),
    }

    const waterRightApplications = [...applications]
    waterRightApplications[index] = updated

    await saveErpReferencePayload({
      ...payload,
      waterRightApplications,
    })

    let emailWarning: string | undefined
    if (
      status === 'additional_info_required' ||
      status === 'approved' ||
      status === 'rejected'
    ) {
      try {
        await notifyWaterRightApplicantForStatus(updated, status)
        updated = { ...updated, lastEmailSentAt: new Date() }
        waterRightApplications[index] = updated
        await saveErpReferencePayload({
          ...payload,
          waterRightApplications,
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
