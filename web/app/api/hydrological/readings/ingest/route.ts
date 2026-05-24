import { respondWithHydrologicalReadingIngest } from '@/lib/hydro-readings-ingest-handler'

export const dynamic = 'force-dynamic'

/** POST-only alias for field apps: same behavior as `POST /api/hydrological/readings`. */
export async function POST(req: Request) {
  return respondWithHydrologicalReadingIngest(req)
}
