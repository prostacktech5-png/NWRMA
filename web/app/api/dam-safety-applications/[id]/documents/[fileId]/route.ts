import { tryRespondWithDbSetupHint } from '@/lib/db'
import { loadOrSeedErpReferencePayload } from '@/lib/db/reference-data-persistence'
import { canReviewDamSafetyApplications } from '@/lib/dam-safety-application'
import { canAccessBankReceiptValidationDesk } from '@/lib/bank-receipt-validation-desk'
import { findDamSafetyDocument, readDamSafetyFile } from '@/lib/dam-safety-file-store'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string; fileId: string }> }
) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) {
      return Response.json(
        { error: 'Send X-Acting-User-Id to identify the ERP user (demo auth).' },
        { status: 401 }
      )
    }
    if (!canReviewDamSafetyApplications(viewer) && !canAccessBankReceiptValidationDesk(viewer)) {
      return Response.json({ error: 'Forbidden.' }, { status: 403 })
    }

    const { id, fileId } = await ctx.params
    const url = new URL(req.url)
    const dispositionParam = url.searchParams.get('disposition')
    const disposition = dispositionParam === 'inline' ? 'inline' : 'attachment'

    const payload = await loadOrSeedErpReferencePayload()
    const application = (payload.damSafetyApplications ?? []).find((a) => a.id === id)
    if (!application) {
      return Response.json({ error: 'Application not found.' }, { status: 404 })
    }

    const doc = findDamSafetyDocument(application, fileId)
    if (!doc?.storageKey) {
      return Response.json(
        { error: 'File not available (demo record or missing upload).' },
        { status: 404 }
      )
    }

    try {
      const { buffer, mimeType } = await readDamSafetyFile(doc.storageKey)
      const safeName = doc.name.replace(/[^\w.\-()+ ]+/g, '_')
      return new Response(new Uint8Array(buffer), {
        headers: {
          'Content-Type': doc.mimeType || mimeType,
          'Content-Disposition': `${disposition}; filename="${safeName}"`,
          'Content-Length': String(buffer.length),
        },
      })
    } catch {
      return Response.json({ error: 'File not found on server.' }, { status: 404 })
    }
  })
}
