import { getSql } from '@/lib/db'
import { ensureHrSchema } from '@/lib/db/hr-schema'

export async function wasNotificationSentToday(
  entityType: string,
  entityId: string,
  channel = 'email'
): Promise<boolean> {
  await ensureHrSchema()
  const sql = getSql()
  const today = new Date().toISOString().slice(0, 10)
  const rows = await sql`
    SELECT id FROM hr_notification_log
    WHERE entity_type = ${entityType}
      AND entity_id = ${entityId}
      AND channel = ${channel}
      AND sent_at::date = ${today}::date
    LIMIT 1
  `
  return (rows as unknown[]).length > 0
}

export async function logNotification(input: {
  entityType: string
  entityId: string
  channel?: string
  recipient: string
  status?: string
}): Promise<void> {
  await ensureHrSchema()
  const sql = getSql()
  const id = `hrnotify-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  await sql`
    INSERT INTO hr_notification_log (id, entity_type, entity_id, channel, recipient, status)
    VALUES (
      ${id},
      ${input.entityType},
      ${input.entityId},
      ${input.channel ?? 'email'},
      ${input.recipient},
      ${input.status ?? 'sent'}
    )
  `
}
