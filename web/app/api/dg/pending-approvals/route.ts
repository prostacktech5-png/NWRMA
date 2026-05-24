import { tryRespondWithDbSetupHint } from '@/lib/db'
import { buildDgPending } from '@/lib/dg-aggregator'

export async function GET() {
  return tryRespondWithDbSetupHint(async () => {
    return Response.json(await buildDgPending())
  })
}
