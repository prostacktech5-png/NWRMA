import { randomUUID } from 'crypto'
import { getSql, isPostgresUndefinedRelationError } from '@/lib/db'
import { withSuperAdminAuth } from '@/lib/super-admin/api-auth'

export async function GET(req: Request) {
  return withSuperAdminAuth(req, 'documents', 'read', async () => {
    const entityType = new URL(req.url).searchParams.get('entityType')
    const entityId = new URL(req.url).searchParams.get('entityId')
    const sql = getSql()
    try {
      let rows
      if (entityType && entityId) {
        rows = await sql`
          SELECT * FROM platform_documents
          WHERE deleted_at IS NULL AND entity_type = ${entityType} AND entity_id = ${entityId}
          ORDER BY created_at DESC LIMIT 200
        `
      } else {
        rows = await sql`
          SELECT * FROM platform_documents
          WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 200
        `
      }
      const items = rows.map((r) => {
        const row = r as Record<string, unknown>
        return {
          id: String(row.id),
          category: String(row.category),
          entityType: String(row.entity_type),
          entityId: String(row.entity_id),
          fileName: String(row.file_name),
          mimeType: row.mime_type != null ? String(row.mime_type) : null,
          sizeBytes: row.size_bytes != null ? Number(row.size_bytes) : null,
          version: Number(row.version ?? 1),
          createdAt: new Date(String(row.created_at)).toISOString(),
        }
      })
      return Response.json({ items })
    } catch (e) {
      if (!isPostgresUndefinedRelationError(e)) throw e
      return Response.json({ items: [] })
    }
  })
}

export async function POST(req: Request) {
  return withSuperAdminAuth(req, 'documents', 'create', async (viewer, req) => {
    let body: Record<string, unknown>
    try {
      body = (await req.json()) as Record<string, unknown>
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const category = typeof body.category === 'string' ? body.category : ''
    const entityType = typeof body.entityType === 'string' ? body.entityType : ''
    const entityId = typeof body.entityId === 'string' ? body.entityId : ''
    const fileName = typeof body.fileName === 'string' ? body.fileName : ''
    const storageKey = typeof body.storageKey === 'string' ? body.storageKey : ''
    if (!category || !entityType || !entityId || !fileName || !storageKey) {
      return Response.json({ error: 'Missing required metadata fields' }, { status: 400 })
    }
    const sql = getSql()
    const id = randomUUID()
    try {
      await sql`
        INSERT INTO platform_documents (
          id, category, entity_type, entity_id, storage_key, file_name,
          mime_type, size_bytes, uploaded_by
        ) VALUES (
          ${id}, ${category}, ${entityType}, ${entityId}, ${storageKey}, ${fileName},
          ${typeof body.mimeType === 'string' ? body.mimeType : null},
          ${typeof body.sizeBytes === 'number' ? body.sizeBytes : null},
          ${viewer.id}
        )
      `
      return Response.json({ id }, { status: 201 })
    } catch (e) {
      if (isPostgresUndefinedRelationError(e)) {
        return Response.json({ error: 'Documents table not migrated' }, { status: 503 })
      }
      throw e
    }
  })
}
