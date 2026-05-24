import type { User } from '@/lib/types'
import { getSql } from '@/lib/db'

/** Director General is org-wide — never department-scoped. */
export function normalizeDirectorGeneralUser(user: User): User {
  if (user.role !== 'dg') return user
  return {
    ...user,
    department: null,
  }
}

export async function persistDirectorGeneralNormalization(userId: string): Promise<void> {
  try {
    const sql = getSql()
    await sql`
      UPDATE "User"
      SET department = NULL, "updatedAt" = now()
      WHERE id = ${userId} AND role = 'dg'
    `
  } catch {
    /* DB optional during local dev */
  }
}
