import { tryRespondWithDbSetupHint } from '@/lib/db'
import { buildDgAlerts } from '@/lib/dg-aggregator'

export async function GET() {
  return tryRespondWithDbSetupHint(async () => {
    return Response.json(await buildDgAlerts())
  })
}
