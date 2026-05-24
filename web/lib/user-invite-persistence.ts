import { randomUUID } from 'crypto'
import { getSql, isPostgresUndefinedColumnError } from '@/lib/db'
import type { HydroNavAccess } from '@/lib/types'

/** Stored in `User.passwordHash` until the invitee completes set-password. Not valid bcrypt. */
export const PENDING_INVITE_PASSWORD_HASH = '__NWRMA_PENDING_INVITE__'

export function isPendingInvitePasswordHash(hash: string | null | undefined): boolean {
  return String(hash ?? '').trim() === PENDING_INVITE_PASSWORD_HASH
}

export type PendingInviteInput = {
  email: string
  fullName: string
  role: string
  department: string | null
  hydroNavAccess?: HydroNavAccess | null
  inviteExpiresAt: Date
}

export async function upsertPendingInviteUser(input: PendingInviteInput): Promise<void> {
  const sql = getSql()
  const email = input.email.trim().toLowerCase()
  const hydroJson =
    input.hydroNavAccess != null ? JSON.stringify(input.hydroNavAccess) : null
  const expiresAt = input.inviteExpiresAt.toISOString()

  const existing = await sql`
    SELECT id FROM "User" WHERE lower(trim(email)) = ${email}
  `
  const existingRow = existing[0] as Record<string, unknown> | undefined
  const id =
    existingRow?.id != null ? String(existingRow.id) : randomUUID()

  if (existingRow?.id != null) {
    try {
      await sql`
        UPDATE "User" SET
          "passwordHash" = ${PENDING_INVITE_PASSWORD_HASH},
          "fullName" = ${input.fullName},
          role = ${input.role},
          department = ${input.department},
          "hydroNavAccess" = ${hydroJson},
          "inviteExpiresAt" = ${expiresAt}::timestamptz,
          "updatedAt" = now()
        WHERE id = ${id}
      `
    } catch (e) {
      if (!isPostgresUndefinedColumnError(e)) throw e
      await sql`
        UPDATE "User" SET
          "passwordHash" = ${PENDING_INVITE_PASSWORD_HASH},
          "fullName" = ${input.fullName},
          role = ${input.role},
          department = ${input.department},
          "hydroNavAccess" = ${hydroJson},
          "updatedAt" = now()
        WHERE id = ${id}
      `
    }
    await setInviteUserActive(sql, id)
    return
  }

  try {
    await sql`
      INSERT INTO "User" (
        id, email, phone, "passwordHash", "fullName", role, department,
        "hydroNavAccess", "inviteExpiresAt", "createdAt", "updatedAt"
      )
      VALUES (
        ${id},
        ${email},
        null,
        ${PENDING_INVITE_PASSWORD_HASH},
        ${input.fullName},
        ${input.role},
        ${input.department},
        ${hydroJson},
        ${expiresAt}::timestamptz,
        now(),
        now()
      )
    `
  } catch (e) {
    if (!isPostgresUndefinedColumnError(e)) throw e
    try {
      await sql`
        INSERT INTO "User" (
          id, email, phone, "passwordHash", "fullName", role, department,
          "hydroNavAccess", "createdAt", "updatedAt"
        )
        VALUES (
          ${id},
          ${email},
          null,
          ${PENDING_INVITE_PASSWORD_HASH},
          ${input.fullName},
          ${input.role},
          ${input.department},
          ${hydroJson},
          now(),
          now()
        )
      `
    } catch (e2) {
      if (!isPostgresUndefinedColumnError(e2)) throw e2
      await sql`
        INSERT INTO "User" (
          id, email, phone, "passwordHash", "fullName", role, department,
          "createdAt", "updatedAt"
        )
        VALUES (
          ${id},
          ${email},
          null,
          ${PENDING_INVITE_PASSWORD_HASH},
          ${input.fullName},
          ${input.role},
          ${input.department},
          now(),
          now()
        )
      `
    }
  }
  await setInviteUserActive(sql, id)
}

async function setInviteUserActive(
  sql: ReturnType<typeof getSql>,
  userId: string,
): Promise<void> {
  try {
    await sql`
      UPDATE "User" SET status = 'active', "updatedAt" = now() WHERE id = ${userId}
    `
  } catch (e) {
    if (!isPostgresUndefinedColumnError(e)) throw e
  }
}

export async function clearInviteExpiryForEmail(email: string): Promise<void> {
  const sql = getSql()
  const key = email.trim().toLowerCase()
  try {
    await sql`
      UPDATE "User" SET "inviteExpiresAt" = NULL, "updatedAt" = now()
      WHERE lower(trim(email)) = ${key}
    `
  } catch (e) {
    if (!isPostgresUndefinedColumnError(e)) throw e
  }
}
