import { randomUUID } from 'crypto'
import { getSql, isPostgresUndefinedRelationError } from '@/lib/db'
import { withSuperAdminAuth } from '@/lib/super-admin/api-auth'

export async function GET(req: Request) {
  return withSuperAdminAuth(req, 'field_ops', 'read', async () => {
    const sql = getSql()
    try {
      const rows = await sql`
        SELECT * FROM field_tasks ORDER BY created_at DESC LIMIT 200
      `
      const items = rows.map((r) => {
        const row = r as Record<string, unknown>
        return {
          id: String(row.id),
          title: String(row.title),
          assigneeUserId: row.assignee_user_id != null ? String(row.assignee_user_id) : null,
          status: String(row.status),
          dueAt: row.due_at ? new Date(String(row.due_at)).toISOString() : null,
          boreholeId: row.borehole_id != null ? String(row.borehole_id) : null,
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
  return withSuperAdminAuth(req, 'field_ops', 'create', async (_viewer, req) => {
    let body: Record<string, unknown>
    try {
      body = (await req.json()) as Record<string, unknown>
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) return Response.json({ error: 'title required' }, { status: 400 })
    const sql = getSql()
    const id = randomUUID()
    try {
      await sql`
        INSERT INTO field_tasks (id, title, assignee_user_id, status, due_at, borehole_id, notes)
        VALUES (
          ${id}, ${title},
          ${typeof body.assigneeUserId === 'string' ? body.assigneeUserId : null},
          ${typeof body.status === 'string' ? body.status : 'pending'},
          ${body.dueAt ? new Date(String(body.dueAt)) : null},
          ${typeof body.boreholeId === 'string' ? body.boreholeId : null},
          ${typeof body.notes === 'string' ? body.notes : null}
        )
      `
      return Response.json({ id }, { status: 201 })
    } catch (e) {
      if (isPostgresUndefinedRelationError(e)) {
        return Response.json({ error: 'Field tasks table not migrated' }, { status: 503 })
      }
      throw e
    }
  })
}
