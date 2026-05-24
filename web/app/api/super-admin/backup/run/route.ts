import { randomUUID } from 'crypto'
import { getSql, isPostgresUndefinedRelationError } from '@/lib/db'
import { withSuperAdminAuth } from '@/lib/super-admin/api-auth'
import { auditMetaFromRequest, writeAuditLog } from '@/lib/super-admin/audit-log'

export async function POST(req: Request) {
  return withSuperAdminAuth(req, 'backup', 'create', async (viewer, req) => {
    let body: { backupType?: string }
    try {
      body = (await req.json().catch(() => ({}))) as { backupType?: string }
    } catch {
      body = {}
    }
    const backupType = typeof body.backupType === 'string' ? body.backupType : 'manual'
    const sql = getSql()
    const id = randomUUID()
    try {
      await sql`
        INSERT INTO backup_runs (id, backup_type, status) VALUES (${id}, ${backupType}, 'running')
      `
    } catch (e) {
      if (!isPostgresUndefinedRelationError(e)) throw e
    }
    const meta = auditMetaFromRequest(req)
    await writeAuditLog({
      actorId: viewer.id,
      action: 'backup.run',
      entityType: 'backup_run',
      entityId: id,
      newValue: { backupType },
      ...meta,
    })
    return Response.json({ id, status: 'running', backupType }, { status: 201 })
  })
}
