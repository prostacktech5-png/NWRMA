import { getSql, tryRespondWithDbSetupHint } from '@/lib/db'

/**
 * GET — public onboarding check: database reachable and how many `User` rows exist.
 * Used by the sign-in page so operators know why login cannot work yet.
 */
export async function GET() {
  return tryRespondWithDbSetupHint(async () => {
    const sql = getSql()
    await sql`
      UPDATE "User"
      SET role = 'hod', department = 'hr', "updatedAt" = now()
      WHERE role = 'admin'
    `
    await sql`
      UPDATE "User"
      SET department = NULL, "updatedAt" = now()
      WHERE role = 'dg' AND department IS NOT NULL
    `
    const rows = (await sql`
      SELECT count(*)::int AS c
      FROM "User"
    `) as { c?: number }[]
    const userCount = Number(rows[0]?.c ?? 0)
    return Response.json({
      ok: true,
      userCount,
      inviteRules: {
        hrAdminMayInvite: ['dg', 'hod', 'staff'],
        departmentHodMayInvite: ['staff'],
        note: 'Platform admin accounts are retired; use HR & Admin HoD for org-wide user management.',
      },
    })
  })
}
