import { createHmac, randomBytes, randomUUID } from 'crypto'
import { getSql, isPostgresUndefinedRelationError } from '@/lib/db'
import { withSuperAdminAuth } from '@/lib/super-admin/api-auth'

function hashApiKey(token: string): string {
  const secret = process.env.SESSION_SECRET?.trim() || 'dev-api-key-secret'
  return createHmac('sha256', secret).update(token).digest('hex')
}

export async function GET(req: Request) {
  return withSuperAdminAuth(req, 'api', 'read', async () => {
    const sql = getSql()
    try {
      const rows = await sql`
        SELECT id, name, key_prefix, scopes, rate_limit_per_min, expires_at, revoked_at, created_at
        FROM api_keys ORDER BY created_at DESC LIMIT 100
      `
      const items = rows.map((r) => {
        const row = r as Record<string, unknown>
        return {
          id: String(row.id),
          name: String(row.name),
          keyPrefix: String(row.key_prefix),
          scopes: row.scopes,
          rateLimitPerMin: Number(row.rate_limit_per_min ?? 60),
          expiresAt: row.expires_at ? new Date(String(row.expires_at)).toISOString() : null,
          revokedAt: row.revoked_at ? new Date(String(row.revoked_at)).toISOString() : null,
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
  return withSuperAdminAuth(req, 'api', 'create', async (viewer, req) => {
    let body: { name?: string; scopes?: string[] }
    try {
      body = (await req.json()) as { name?: string; scopes?: string[] }
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return Response.json({ error: 'name required' }, { status: 400 })
    const rawKey = `nwrma_${randomBytes(24).toString('base64url')}`
    const keyPrefix = rawKey.slice(0, 12)
    const keyHash = hashApiKey(rawKey)
    const id = randomUUID()
    const sql = getSql()
    try {
      await sql`
        INSERT INTO api_keys (id, name, key_hash, key_prefix, scopes, created_by)
        VALUES (
          ${id}, ${name}, ${keyHash}, ${keyPrefix},
          ${JSON.stringify(body.scopes ?? [])}, ${viewer.id}
        )
      `
      return Response.json({ id, keyPrefix, apiKey: rawKey }, { status: 201 })
    } catch (e) {
      if (isPostgresUndefinedRelationError(e)) {
        return Response.json({ error: 'API keys table not migrated' }, { status: 503 })
      }
      throw e
    }
  })
}
