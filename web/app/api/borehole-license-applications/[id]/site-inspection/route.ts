import { tryRespondWithDbSetupHint } from '@/lib/db'
import {
  loadOrSeedErpReferencePayload,
  saveErpReferencePayload,
} from '@/lib/db/reference-data-persistence'
import { canReviewLicenseApplications } from '@/lib/borehole-license-application'
import { notifyApplicantSiteInspection } from '@/lib/borehole-license-notify'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'

function isValidIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T12:00:00`))
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
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
        { error: 'Only Boreholes staff or administrators can schedule inspections.' },
        { status: 403 }
      )
    }

    const { id } = await ctx.params
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const date =
      body && typeof body === 'object' && typeof (body as { date?: unknown }).date === 'string'
        ? (body as { date: string }).date.trim()
        : ''
    if (!isValidIsoDate(date)) {
      return Response.json({ error: 'Valid inspection date (YYYY-MM-DD) is required.' }, { status: 400 })
    }

    const notes =
      body &&
      typeof body === 'object' &&
      typeof (body as { notes?: unknown }).notes === 'string'
        ? (body as { notes: string }).notes.trim() || null
        : null

    const technicalReportSummary =
      body &&
      typeof body === 'object' &&
      typeof (body as { technicalReportSummary?: unknown }).technicalReportSummary === 'string'
        ? (body as { technicalReportSummary: string }).technicalReportSummary.trim() || null
        : undefined

    const payload = await loadOrSeedErpReferencePayload()
    const index = payload.licenseApplications.findIndex((a) => a.id === id)
    if (index < 0) {
      return Response.json({ error: 'Application not found.' }, { status: 404 })
    }

    const existing = payload.licenseApplications[index]
    const updated = {
      ...existing,
      siteInspectionDate: date,
      siteInspectionNotes: notes,
      technicalReportSummary:
        technicalReportSummary !== undefined
          ? technicalReportSummary
          : existing.technicalReportSummary ?? null,
      status: existing.status === 'submitted' ? ('under_review' as const) : existing.status,
      reviewedAt: new Date(),
    }

    const licenseApplications = [...payload.licenseApplications]
    licenseApplications[index] = updated
    await saveErpReferencePayload({ ...payload, licenseApplications })

    let emailWarning: string | undefined
    try {
      await notifyApplicantSiteInspection(updated, date, notes)
      updated.lastEmailSentAt = new Date()
      licenseApplications[index] = updated
      await saveErpReferencePayload({ ...payload, licenseApplications })
    } catch (e) {
      emailWarning =
        e instanceof Error
          ? e.message
          : 'Inspection scheduled but notification email could not be sent.'
    }

    return Response.json({ ok: true, application: updated, emailWarning })
  })
}
