import { randomUUID } from 'crypto'
import { getSql, isPostgresUndefinedColumnError } from '@/lib/db'
import { parseAccountExpiresAt } from '@/lib/account-expiry'
import { parseStoredHydroNavAccess } from '@/lib/hydro-nav-access'
import type { HydroNavAccess } from '@/lib/types'

/**
 * Persist ERP invitation passwords in the same Prisma table as the Express API (`User`).
 * Matches `server/prisma/schema.prisma` — not the legacy `app_users` snake_case table.
 */
export type StoredPasswordRecord = {
  id: string
  email: string
  passwordHash: string
  username: string
  fullName: string
  role: string
  department: string | null
  hydroNavAccess: HydroNavAccess | null
  accountExpiresAt: string | null
  updatedAt: string
}

function rowToRecord(r: Record<string, unknown>): StoredPasswordRecord {
  const email = String(r.email ?? '')
  const local = email.includes('@') ? (email.split('@')[0] ?? '') : ''
  return {
    id: String(r.id),
    email,
    passwordHash: String(r.password_hash ?? r.passwordHash ?? ''),
    username: String(r.username ?? local ?? ''),
    fullName: String(r.full_name ?? r.fullName ?? ''),
    role: String(r.role ?? ''),
    department: r.department != null ? String(r.department) : null,
    hydroNavAccess: parseStoredHydroNavAccess(r.hydroNavAccess ?? r.hydro_nav_access),
    accountExpiresAt: (() => {
      const d = parseAccountExpiresAt(r.account_expires_at ?? r.accountExpiresAt)
      return d ? d.toISOString() : null
    })(),
    updatedAt: new Date(String(r.updated_at ?? r.updatedAt ?? Date.now())).toISOString(),
  }
}

export async function upsertPasswordRecord(
  record: Omit<StoredPasswordRecord, 'updatedAt' | 'id'> & { id?: string }
): Promise<void> {
  const sql = getSql()
  const email = record.email.trim().toLowerCase()
  const hydroJson =
    record.hydroNavAccess != null ? JSON.stringify(record.hydroNavAccess) : null
  const existing = await sql`
    SELECT id FROM "User" WHERE lower(trim(email)) = ${email}
  `
  const existingRow = existing[0] as Record<string, unknown> | undefined
  const id =
    record.id ?? (existingRow?.id != null ? String(existingRow.id) : randomUUID())

  if (existingRow?.id != null) {
    try {
      await sql`
        UPDATE "User" SET
          "passwordHash" = ${record.passwordHash},
          "fullName" = ${record.fullName},
          role = ${record.role},
          department = ${record.department},
          "hydroNavAccess" = ${hydroJson},
          "inviteExpiresAt" = NULL,
          "updatedAt" = now()
        WHERE id = ${id}
      `
    } catch (e) {
      if (!isPostgresUndefinedColumnError(e)) throw e
      await sql`
        UPDATE "User" SET
          "passwordHash" = ${record.passwordHash},
          "fullName" = ${record.fullName},
          role = ${record.role},
          department = ${record.department},
          "updatedAt" = now()
        WHERE id = ${id}
      `
    }
    return
  }

  try {
    await sql`
      INSERT INTO "User" (id, email, phone, "passwordHash", "fullName", role, department, "hydroNavAccess", "createdAt", "updatedAt")
      VALUES (
        ${id},
        ${email},
        null,
        ${record.passwordHash},
        ${record.fullName},
        ${record.role},
        ${record.department},
        ${hydroJson},
        now(),
        now()
      )
    `
  } catch (e) {
    if (!isPostgresUndefinedColumnError(e)) throw e
    await sql`
      INSERT INTO "User" (id, email, phone, "passwordHash", "fullName", role, department, "createdAt", "updatedAt")
      VALUES (
        ${id},
        ${email},
        null,
        ${record.passwordHash},
        ${record.fullName},
        ${record.role},
        ${record.department},
        now(),
        now()
      )
    `
  }
}

export async function findRecordByEmail(email: string): Promise<StoredPasswordRecord | null> {
  if (!process.env.DATABASE_URL?.trim()) return null
  const sql = getSql()
  const key = email.trim().toLowerCase()
  let rows: Record<string, unknown>[]
  try {
    rows = (await sql`
    SELECT id, email,
      "passwordHash" AS password_hash,
      "fullName" AS full_name,
      role, department,
      "hydroNavAccess" AS "hydroNavAccess",
      account_expires_at,
      "updatedAt" AS updated_at
    FROM "User"
    WHERE lower(trim(email)) = ${key}
  `) as Record<string, unknown>[]
  } catch (e) {
    if (!isPostgresUndefinedColumnError(e)) throw e
    try {
      rows = (await sql`
    SELECT id, email,
      "passwordHash" AS password_hash,
      "fullName" AS full_name,
      role, department,
      "hydroNavAccess" AS "hydroNavAccess",
      "updatedAt" AS updated_at
    FROM "User"
    WHERE lower(trim(email)) = ${key}
  `) as Record<string, unknown>[]
    } catch (e2) {
      if (!isPostgresUndefinedColumnError(e2)) throw e2
      rows = (await sql`
    SELECT id, email,
      "passwordHash" AS password_hash,
      "fullName" AS full_name,
      role, department,
      "updatedAt" AS updated_at
    FROM "User"
    WHERE lower(trim(email)) = ${key}
  `) as Record<string, unknown>[]
    }
  }
  const r = rows[0] as Record<string, unknown> | undefined
  return r ? rowToRecord(r) : null
}

export async function getRecordById(id: string): Promise<StoredPasswordRecord | null> {
  if (!process.env.DATABASE_URL?.trim()) return null
  const sql = getSql()
  let rows: Record<string, unknown>[]
  try {
    rows = (await sql`
    SELECT id, email,
      "passwordHash" AS password_hash,
      "fullName" AS full_name,
      role, department,
      "hydroNavAccess" AS "hydroNavAccess",
      account_expires_at,
      "updatedAt" AS updated_at
    FROM "User"
    WHERE id = ${id.trim()}
  `) as Record<string, unknown>[]
  } catch (e) {
    if (!isPostgresUndefinedColumnError(e)) throw e
    try {
      rows = (await sql`
    SELECT id, email,
      "passwordHash" AS password_hash,
      "fullName" AS full_name,
      role, department,
      "hydroNavAccess" AS "hydroNavAccess",
      "updatedAt" AS updated_at
    FROM "User"
    WHERE id = ${id.trim()}
  `) as Record<string, unknown>[]
    } catch (e2) {
      if (!isPostgresUndefinedColumnError(e2)) throw e2
      rows = (await sql`
    SELECT id, email,
      "passwordHash" AS password_hash,
      "fullName" AS full_name,
      role, department,
      "updatedAt" AS updated_at
    FROM "User"
    WHERE id = ${id.trim()}
  `) as Record<string, unknown>[]
    }
  }
  const r = rows[0] as Record<string, unknown> | undefined
  return r ? rowToRecord(r) : null
}

export async function updateUserProfileFields(
  id: string,
  fields: { fullName?: string; hydroNavAccess?: HydroNavAccess | null },
): Promise<{ ok: true } | { ok: false; code: 'not_found' }> {
  if (!process.env.DATABASE_URL?.trim()) return { ok: false, code: 'not_found' }
  const sql = getSql()
  const trimmed = id.trim()
  const found = await sql`SELECT id FROM "User" WHERE id = ${trimmed}`
  if ((found as unknown[]).length === 0) return { ok: false, code: 'not_found' }

  if (fields.fullName !== undefined && fields.hydroNavAccess !== undefined) {
    const hj =
      fields.hydroNavAccess != null ? JSON.stringify(fields.hydroNavAccess) : null
    try {
      await sql`
      UPDATE "User" SET
        "fullName" = ${fields.fullName},
        "hydroNavAccess" = ${hj},
        "updatedAt" = now()
      WHERE id = ${trimmed}
    `
    } catch (e) {
      if (!isPostgresUndefinedColumnError(e)) throw e
      await sql`
      UPDATE "User" SET "fullName" = ${fields.fullName}, "updatedAt" = now()
      WHERE id = ${trimmed}
    `
    }
  } else if (fields.fullName !== undefined) {
    await sql`
      UPDATE "User" SET "fullName" = ${fields.fullName}, "updatedAt" = now()
      WHERE id = ${trimmed}
    `
  } else if (fields.hydroNavAccess !== undefined) {
    const hj =
      fields.hydroNavAccess != null ? JSON.stringify(fields.hydroNavAccess) : null
    try {
      await sql`
      UPDATE "User" SET "hydroNavAccess" = ${hj}, "updatedAt" = now()
      WHERE id = ${trimmed}
    `
    } catch (e) {
      if (!isPostgresUndefinedColumnError(e)) throw e
    }
  }
  return { ok: true }
}
