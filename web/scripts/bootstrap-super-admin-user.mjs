/**
 * One-time bootstrap: create/update ERP user and assign platform super_admin role.
 * Usage: cd web && npm run bootstrap:super-admin
 *
 * Env (optional overrides):
 *   BOOTSTRAP_SUPER_ADMIN_EMAIL
 *   BOOTSTRAP_SUPER_ADMIN_PASSWORD
 *   BOOTSTRAP_SUPER_ADMIN_NAME
 */
import { randomUUID } from 'crypto'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'
import postgres from 'postgres'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env.local')

function loadEnvFile(path) {
  if (!existsSync(path)) return
  const text = readFileSync(path, 'utf8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

loadEnvFile(envPath)

const email = (process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL || 'prostacktech5@gmail.com')
  .trim()
  .toLowerCase()
const password = process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD || 'admin123'
const fullName = process.env.BOOTSTRAP_SUPER_ADMIN_NAME || 'Super Admin'
const SUPER_ADMIN_ROLE_ID = 'role_super_admin'

async function main() {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) {
    console.error('DATABASE_URL is not set. Add it to web/.env.local')
    process.exit(1)
  }

  const sql = postgres(url, { max: 1, prepare: false })
  const passwordHash = await bcrypt.hash(password, 10)

  try {
    const existing = await sql`
      SELECT id FROM "User" WHERE lower(trim(email)) = ${email} LIMIT 1
    `
    let userId = existing[0] ? String(existing[0].id) : null
    let created = false

    if (userId) {
      try {
        await sql`
          UPDATE "User" SET
            "passwordHash" = ${passwordHash},
            "fullName" = ${fullName},
            role = 'hod',
            department = 'hr',
            status = 'active',
            must_change_password = false,
            failed_login_count = 0,
            locked_until = NULL,
            deleted_at = NULL,
            "updatedAt" = now()
          WHERE id = ${userId}
        `
      } catch {
        await sql`
          UPDATE "User" SET
            "passwordHash" = ${passwordHash},
            "fullName" = ${fullName},
            role = 'hod',
            department = 'hr',
            "updatedAt" = now()
          WHERE id = ${userId}
        `
      }
      console.log(`[bootstrap] Updated existing user ${email} (${userId})`)
    } else {
      userId = randomUUID()
      created = true
      try {
        await sql`
          INSERT INTO "User" (
            id, email, phone, "passwordHash", "fullName", role, department,
            status, must_change_password, "createdAt", "updatedAt"
          ) VALUES (
            ${userId}, ${email}, null, ${passwordHash}, ${fullName},
            'hod', 'hr', 'active', false, now(), now()
          )
        `
      } catch {
        await sql`
          INSERT INTO "User" (
            id, email, phone, "passwordHash", "fullName", role, department,
            "createdAt", "updatedAt"
          ) VALUES (
            ${userId}, ${email}, null, ${passwordHash}, ${fullName},
            'hod', 'hr', now(), now()
          )
        `
      }
      console.log(`[bootstrap] Created user ${email} (${userId})`)
    }

    await sql`DELETE FROM user_platform_roles WHERE user_id = ${userId}`
    await sql`
      INSERT INTO user_platform_roles (user_id, role_id, is_primary)
      VALUES (${userId}, ${SUPER_ADMIN_ROLE_ID}, true)
    `

    const roleCheck = await sql`
      SELECT pr.code FROM user_platform_roles upr
      JOIN platform_roles pr ON pr.id = upr.role_id
      WHERE upr.user_id = ${userId}
    `
    const codes = roleCheck.map((r) => r.code)
    console.log('[bootstrap] Platform roles:', codes.join(', ') || '(none)')
    console.log('[bootstrap] Done. Sign in at /login with the configured email and password.')
    console.log(JSON.stringify({ ok: true, userId, email, created, superAdmin: true }))
  } finally {
    await sql.end({ timeout: 5 })
  }
}

main().catch((err) => {
  console.error('[bootstrap] Failed:', err)
  process.exit(1)
})
