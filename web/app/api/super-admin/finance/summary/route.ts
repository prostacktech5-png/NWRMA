import { getSql, isPostgresUndefinedRelationError } from '@/lib/db'
import { withSuperAdminAuth } from '@/lib/super-admin/api-auth'

export async function GET(req: Request) {
  return withSuperAdminAuth(req, 'finance', 'read', async () => {
    const sql = getSql()
    let revenueTotal = 0
    let receiptCount = 0
    try {
      const rev = await sql`
        SELECT COALESCE(SUM(amount), 0)::float AS t, COUNT(*)::int AS c
        FROM finance_funds_receipts
      `
      revenueTotal = Number((rev[0] as { t: number })?.t ?? 0)
      receiptCount = Number((rev[0] as { c: number })?.c ?? 0)
    } catch (e) {
      if (!isPostgresUndefinedRelationError(e)) throw e
    }
    return Response.json({
      revenueTotal,
      receiptCount,
      currency: 'SLL',
    })
  })
}
