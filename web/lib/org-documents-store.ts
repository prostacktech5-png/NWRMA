import { randomUUID } from 'crypto'
import { getSql } from '@/lib/db'
import { ensureOrgDocumentsSchema } from '@/lib/db/org-documents-schema'
import { isValidErpDepartment } from '@/lib/org-departments'
import type { Department } from '@/lib/types'

export type OrgDepartmentDocument = {
  id: string
  title: string
  description: string
  fileName: string
  storageKey: string
  mimeType: string | null
  sizeBytes: number | null
  fromDepartment: Exclude<Department, null>
  toDepartment: Exclude<Department, null>
  uploadedByUserId: string | null
  uploadedByName: string
  category: string
  createdAt: string
}

function rowToDoc(r: Record<string, unknown>): OrgDepartmentDocument {
  return {
    id: String(r.id),
    title: String(r.title),
    description: String(r.description ?? ''),
    fileName: String(r.file_name),
    storageKey: String(r.storage_key),
    mimeType: r.mime_type != null ? String(r.mime_type) : null,
    sizeBytes: r.size_bytes != null ? Number(r.size_bytes) : null,
    fromDepartment: String(r.from_department) as Exclude<Department, null>,
    toDepartment: String(r.to_department) as Exclude<Department, null>,
    uploadedByUserId: r.uploaded_by_user_id != null ? String(r.uploaded_by_user_id) : null,
    uploadedByName: String(r.uploaded_by_name ?? ''),
    category: String(r.category ?? 'general'),
    createdAt: new Date(String(r.created_at)).toISOString(),
  }
}

export type ListOrgDocumentsOpts = {
  q?: string
  fromDepartment?: string
  toDepartment?: string
  scope?: 'all' | 'inbox' | 'sent'
  homeDepartment?: Exclude<Department, null>
  limit?: number
}

export async function listOrgDocuments(opts: ListOrgDocumentsOpts = {}): Promise<OrgDepartmentDocument[]> {
  await ensureOrgDocumentsSchema()
  const sql = getSql()
  const limit = Math.min(opts.limit ?? 200, 500)

  const rows = await sql`
    SELECT * FROM org_department_documents
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT ${limit}
  `

  let list = (rows as Record<string, unknown>[]).map(rowToDoc)

  if (opts.scope === 'inbox' && opts.homeDepartment) {
    list = list.filter((d) => d.toDepartment === opts.homeDepartment)
  } else if (opts.scope === 'sent' && opts.homeDepartment) {
    list = list.filter((d) => d.fromDepartment === opts.homeDepartment)
  }

  if (opts.fromDepartment) {
    list = list.filter((d) => d.fromDepartment === opts.fromDepartment)
  }
  if (opts.toDepartment) {
    list = list.filter((d) => d.toDepartment === opts.toDepartment)
  }

  const q = opts.q?.trim().toLowerCase()
  if (q) {
    list = list.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.fileName.toLowerCase().includes(q) ||
        d.fromDepartment.toLowerCase().includes(q) ||
        d.toDepartment.toLowerCase().includes(q) ||
        d.uploadedByName.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q)
    )
  }

  return list
}

export async function getOrgDocumentById(id: string): Promise<OrgDepartmentDocument | null> {
  await ensureOrgDocumentsSchema()
  const sql = getSql()
  const rows = await sql`
    SELECT * FROM org_department_documents WHERE id = ${id} AND deleted_at IS NULL
  `
  const row = (rows as Record<string, unknown>[])[0]
  return row ? rowToDoc(row) : null
}

export type CreateOrgDocumentInput = {
  title: string
  description?: string
  fileName: string
  storageKey: string
  mimeType: string
  sizeBytes: number
  fromDepartment: Exclude<Department, null>
  toDepartment: Exclude<Department, null>
  uploadedByUserId: string | null
  uploadedByName: string
  category?: string
}

export async function createOrgDocument(input: CreateOrgDocumentInput): Promise<OrgDepartmentDocument> {
  if (!isValidErpDepartment(input.fromDepartment)) {
    throw new Error('Invalid from department')
  }
  if (!isValidErpDepartment(input.toDepartment)) {
    throw new Error('Invalid to department')
  }
  if (input.fromDepartment === input.toDepartment) {
    throw new Error('Cannot send a document to the same department')
  }

  await ensureOrgDocumentsSchema()
  const sql = getSql()
  const id = randomUUID()
  await sql`
    INSERT INTO org_department_documents (
      id, title, description, file_name, storage_key, mime_type, size_bytes,
      from_department, to_department, uploaded_by_user_id, uploaded_by_name, category
    ) VALUES (
      ${id},
      ${input.title.trim()},
      ${input.description?.trim() ?? ''},
      ${input.fileName},
      ${input.storageKey},
      ${input.mimeType},
      ${input.sizeBytes},
      ${input.fromDepartment},
      ${input.toDepartment},
      ${input.uploadedByUserId},
      ${input.uploadedByName.trim()},
      ${input.category?.trim() || 'general'}
    )
  `
  return (await getOrgDocumentById(id))!
}

export async function softDeleteOrgDocument(id: string): Promise<boolean> {
  await ensureOrgDocumentsSchema()
  const sql = getSql()
  const rows = await sql`
    UPDATE org_department_documents SET deleted_at = NOW()
    WHERE id = ${id} AND deleted_at IS NULL
    RETURNING id
  `
  return (rows as unknown[]).length > 0
}

export function orgDocumentToJson(d: OrgDepartmentDocument) {
  return { ...d }
}
