import { withOrgDocumentsApi } from '@/lib/org-documents-api-auth'
import { saveOrgDocumentFile } from '@/lib/org-document-file-store'
import { isValidErpDepartment } from '@/lib/org-departments'
import {
  createOrgDocument,
  listOrgDocuments,
  orgDocumentToJson,
} from '@/lib/org-documents-store'
import type { Department } from '@/lib/types'

export async function GET(req: Request) {
  return withOrgDocumentsApi(req, 'view', async () => {
    const url = new URL(req.url)
    const q = url.searchParams.get('q') ?? undefined
    const fromDepartment = url.searchParams.get('fromDepartment') ?? undefined
    const toDepartment = url.searchParams.get('toDepartment') ?? undefined
    const scopeRaw = url.searchParams.get('scope')
    const scope =
      scopeRaw === 'inbox' || scopeRaw === 'sent' || scopeRaw === 'all' ? scopeRaw : 'all'
    const homeRaw = url.searchParams.get('homeDepartment')
    const homeDepartment =
      homeRaw && isValidErpDepartment(homeRaw) ? (homeRaw as Exclude<Department, null>) : undefined

    const documents = await listOrgDocuments({
      q,
      fromDepartment,
      toDepartment,
      scope,
      homeDepartment,
    })
    return Response.json({ documents: documents.map(orgDocumentToJson) })
  })
}

export async function POST(req: Request) {
  return withOrgDocumentsApi(req, 'send', async (viewer) => {
    const fromDept = viewer.department
    if (!fromDept || !isValidErpDepartment(fromDept)) {
      return Response.json(
        { error: 'Your account must be assigned to a department to send documents.' },
        { status: 400 }
      )
    }

    let form: FormData
    try {
      form = await req.formData()
    } catch {
      return Response.json({ error: 'Invalid form data' }, { status: 400 })
    }

    const file = form.get('file')
    if (!(file instanceof File) || file.size === 0) {
      return Response.json({ error: 'A file is required.' }, { status: 400 })
    }

    const title = String(form.get('title') ?? '').trim()
    const toDepartment = String(form.get('toDepartment') ?? '').trim().toLowerCase()
    if (!title) {
      return Response.json({ error: 'Title is required.' }, { status: 400 })
    }
    if (!isValidErpDepartment(toDepartment)) {
      return Response.json({ error: 'Select a valid recipient department.' }, { status: 400 })
    }

    const description = String(form.get('description') ?? '').trim()
    const category = String(form.get('category') ?? 'general').trim() || 'general'

    const buffer = Buffer.from(await file.arrayBuffer())
    let saved: { storageKey: string; mimeType: string; sizeBytes: number }
    try {
      saved = await saveOrgDocumentFile({
        originalName: file.name,
        mimeType: file.type || 'application/octet-stream',
        buffer,
      })
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message : 'File upload failed' },
        { status: 400 }
      )
    }

    const doc = await createOrgDocument({
      title,
      description,
      fileName: file.name,
      storageKey: saved.storageKey,
      mimeType: saved.mimeType,
      sizeBytes: saved.sizeBytes,
      fromDepartment: fromDept as Exclude<Department, null>,
      toDepartment: toDepartment as Exclude<Department, null>,
      uploadedByUserId: viewer.id,
      uploadedByName: viewer.name,
      category,
    })

    return Response.json({ document: orgDocumentToJson(doc) }, { status: 201 })
  })
}
