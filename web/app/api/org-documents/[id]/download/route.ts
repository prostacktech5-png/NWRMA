import { withOrgDocumentsApi } from '@/lib/org-documents-api-auth'
import { readOrgDocumentFile } from '@/lib/org-document-file-store'
import { getOrgDocumentById } from '@/lib/org-documents-store'

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  return withOrgDocumentsApi(req, 'download', async () => {
    const doc = await getOrgDocumentById(decodeURIComponent(id))
    if (!doc) return new Response('Not found', { status: 404 })

    try {
      const { buffer, mimeType } = await readOrgDocumentFile(doc.storageKey)
      const mime = doc.mimeType || mimeType
      return new Response(new Uint8Array(buffer), {
        headers: {
          'Content-Type': mime,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.fileName)}"`,
          'Cache-Control': 'private, max-age=3600',
        },
      })
    } catch {
      return new Response('File not found on server', { status: 404 })
    }
  })
}
