import { getSql } from '@/lib/db'
import { ensureHrSchema } from '@/lib/db/hr-schema'

export async function appendHrAuditLog(input: {
  entityType: string
  entityId: string
  action: string
  actorUserId: string | null
  payload?: Record<string, unknown>
}): Promise<void> {
  await ensureHrSchema()
  const sql = getSql()
  const id = `hraudit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  await sql`
    INSERT INTO hr_audit_log (id, entity_type, entity_id, action, actor_user_id, payload)
    VALUES (
      ${id},
      ${input.entityType},
      ${input.entityId},
      ${input.action},
      ${input.actorUserId},
      ${input.payload != null ? JSON.stringify(input.payload) : null}
    )
  `
}
