import { withSuperAdminAuth } from '@/lib/super-admin/api-auth'
import { auditLogsToCsv, listUnifiedAuditLogs } from '@/lib/super-admin/audit-log'

export async function GET(req: Request) {
  return withSuperAdminAuth(req, 'audit', 'read', async () => {
    const url = new URL(req.url)
    const exportCsv = url.searchParams.get('export') === 'csv'
    const limit = exportCsv
      ? Math.min(Number(url.searchParams.get('limit') ?? 10_000), 10_000)
      : Number(url.searchParams.get('limit') ?? 50)
    const offset = exportCsv ? 0 : Number(url.searchParams.get('offset') ?? 0)
    const from = url.searchParams.get('from') ?? undefined
    const to = url.searchParams.get('to') ?? undefined
    const actor = url.searchParams.get('actor') ?? undefined
    const action = url.searchParams.get('action') ?? url.searchParams.get('eventType') ?? undefined
    const q = url.searchParams.get('q') ?? undefined

    const result = await listUnifiedAuditLogs({
      limit,
      offset,
      from,
      to,
      actor,
      action: action && action !== 'all' ? action : undefined,
      q,
    })

    if (exportCsv) {
      const csv = auditLogsToCsv(result.items)
      const stamp = new Date().toISOString().slice(0, 10)
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="audit-security-log-${stamp}.csv"`,
        },
      })
    }

    return Response.json(result)
  })
}
