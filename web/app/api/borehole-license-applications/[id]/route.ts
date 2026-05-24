import { tryRespondWithDbSetupHint } from '@/lib/db'
import {
  loadOrSeedErpReferencePayload,
  saveErpReferencePayload,
} from '@/lib/db/reference-data-persistence'
import {
  canReviewLicenseApplications,
  isReviewableLicenseStatus,
  upsertDrillingCompanyFromLicense,
} from '@/lib/borehole-license-application'
import { notifyApplicantForLicenseStatus } from '@/lib/borehole-license-notify'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import type { LicenseApplicationStatus } from '@/lib/types'

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) {
      return Response.json(
        { error: 'Send X-Acting-User-Id to identify the ERP user (demo auth).' },
        { status: 401 }
      )
    }
    if (!canReviewLicenseApplications(viewer)) {
      return Response.json(
        {
          error:
            'Only Hydrological Application processing unit staff, Boreholes staff, or administrators can review licence applications.',
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

    const technicalReportSummary =
      body &&
      typeof body === 'object' &&
      typeof (body as { technicalReportSummary?: unknown }).technicalReportSummary === 'string'
        ? (body as { technicalReportSummary: string }).technicalReportSummary.trim() || null
        : undefined

    if (status && !isReviewableLicenseStatus(status)) {
      return Response.json(
        {
          error:
            'Invalid status. Use under_review, approved, rejected, or additional_info_required.',
        },
        { status: 400 }
      )
    }

    if (!status && technicalReportSummary === undefined) {
      return Response.json({ error: 'No updates provided.' }, { status: 400 })
    }

    const payload = await loadOrSeedErpReferencePayload()
    const index = payload.licenseApplications.findIndex((a) => a.id === id)
    if (index < 0) {
      return Response.json({ error: 'Application not found.' }, { status: 404 })
    }

    const existing = payload.licenseApplications[index]
    let updated = {
      ...existing,
      status: status ? (status as LicenseApplicationStatus) : existing.status,
      reviewNote: reviewNote ?? existing.reviewNote ?? null,
      technicalReportSummary:
        technicalReportSummary !== undefined
          ? technicalReportSummary
          : existing.technicalReportSummary ?? null,
      reviewedAt: new Date(),
    }

    let drillingCompanies = payload.drillingCompanies
    let registryMessage: string | undefined

    if (status === 'approved') {
      const { companies, company } = upsertDrillingCompanyFromLicense(
        drillingCompanies,
        updated
      )
      drillingCompanies = companies
      updated = {
        ...updated,
        licensedCompanyId: company.id,
        organisationName: company.name,
      }
      registryMessage = `${company.name} is now listed under Drilling Companies (licence valid until ${company.licenseExpiry.toISOString().slice(0, 10)}).`
    }

    const licenseApplications = [...payload.licenseApplications]
    licenseApplications[index] = updated

    await saveErpReferencePayload({
      ...payload,
      licenseApplications,
      drillingCompanies,
    })

    let emailWarning: string | undefined
    if (
      status === 'additional_info_required' ||
      status === 'approved' ||
      status === 'rejected'
    ) {
      try {
        await notifyApplicantForLicenseStatus(updated, status)
        updated = { ...updated, lastEmailSentAt: new Date() }
        licenseApplications[index] = updated
        await saveErpReferencePayload({
          ...payload,
          licenseApplications,
          drillingCompanies,
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
      registryMessage,
    })
  })
}
