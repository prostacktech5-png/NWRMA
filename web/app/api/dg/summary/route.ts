import { tryRespondWithDbSetupHint } from '@/lib/db'
import { buildDgSummary } from '@/lib/dg-aggregator'

export async function GET() {
  return tryRespondWithDbSetupHint(async () => {
    return Response.json(await buildDgSummary())
  })
}
