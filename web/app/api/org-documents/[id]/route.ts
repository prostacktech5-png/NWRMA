import { withOrgDocumentsApi } from '@/lib/org-documents-api-auth'
import { canDeleteOrgDocument } from '@/lib/org-documents-access-policy'
import {
  getOrgDocumentById,
  orgDocumentToJson,
  softDeleteOrgDocument,
} from '@/lib/org-documents-store'

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  return withOrgDocumentsApi(req, 'view', async () => {
    const doc = await getOrgDocumentById(decodeURIComponent(id))
    if (!doc) return Response.json({ error: 'Document not found' }, { status: 404 })
    return Response.json({
      document: orgDocumentToJson(doc),
      downloadUrl: `/api/org-documents/${encodeURIComponent(doc.id)}/download`,
    })
  })
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  return withOrgDocumentsApi(req, 'delete', async (viewer) => {
    const doc = await getOrgDocumentById(decodeURIComponent(id))
    if (!doc) return Response.json({ error: 'Document not found' }, { status: 404 })
    if (!canDeleteOrgDocument(viewer, doc)) {
      return Response.json({ error: 'Not allowed to delete this document.' }, { status: 403 })
    }
    await softDeleteOrgDocument(doc.id)
    return Response.json({ ok: true })
  })
}
