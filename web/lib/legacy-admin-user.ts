import type { User } from '@/lib/types'
import { getSql } from '@/lib/db'

/** Map retired platform `admin` accounts to HR & Admin HoD. */
export function normalizeLegacyAdminUser(user: User): User {
  if (user.role !== 'admin') return user
  return {
    ...user,
    role: 'hod',
    department: 'hr',
  }
}

export async function persistLegacyAdminMigration(userId: string): Promise<void> {
  try {
    const sql = getSql()
    await sql`
      UPDATE "User"
      SET role = 'hod', department = 'hr', "updatedAt" = now()
      WHERE id = ${userId} AND role = 'admin'
    `
  } catch {
    /* DB optional during local dev */
  }
}
