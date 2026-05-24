import { tryRespondWithDbSetupHint } from '@/lib/db'
import { recreateDemoWaterTestingRequests } from '@/lib/db/water-testing-persistence'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { WATER_TESTING_DEMO_SEEDS } from '@/lib/seed-water-testing-demo'
import { canManageWaterTestingRequests } from '@/lib/water-testing-access'
import { notifyWaterTestingReceived } from '@/lib/water-testing-notify'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) {
      return Response.json(
        { error: 'Send X-Acting-User-Id to identify the ERP user (demo auth).' },
        { status: 401 },
      )
    }
    if (!canManageWaterTestingRequests(viewer)) {
      return Response.json(
        { error: 'You do not have access to water testing requests.' },
        { status: 403 },
      )
    }

    const seedResult = await recreateDemoWaterTestingRequests(
      WATER_TESTING_DEMO_SEEDS.map((d) => ({
        publicCaseId: d.publicCaseId,
        input: d.input,
      })),
    )

    const emailWarnings: string[] = []
    for (const row of seedResult.rows) {
      try {
        await notifyWaterTestingReceived(row)
      } catch (e) {
        emailWarnings.push(
          `${row.reference}: ${e instanceof Error ? e.message : 'Email could not be sent.'}`,
        )
      }
    }

    return Response.json({
      ok: true,
      created: seedResult.created,
      skipped: seedResult.skipped,
      deleted: seedResult.deleted ?? 0,
      references: seedResult.references,
      emailWarnings,
    })
  })
}
