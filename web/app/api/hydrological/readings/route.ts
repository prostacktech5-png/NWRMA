import { tryRespondWithDbSetupHint } from '@/lib/db'
import { readingToJson } from '@/lib/hydro-api-json'
import { respondWithHydrologicalReadingIngest } from '@/lib/hydro-readings-ingest-handler'
import { getHydroPaymentStore } from '@/lib/hydro-payment-store'

export const dynamic = 'force-dynamic'

export async function GET() {
  return tryRespondWithDbSetupHint(async () => {
    const store = await getHydroPaymentStore()
    return Response.json(
      {
        readings: store.readings.map(readingToJson),
        settings: {
          perReadingRateSle: store.settings.perReadingRateSle,
        },
      },
      {
        headers: {
          'Cache-Control': 'private, no-store, max-age=0',
        },
      }
    )
  })
}

/**
 * Ingest a gauge reading into `water_level_readings`. New rows default to HoD **pending**; monitoring uses only
 * **valid** rows after HoD confirms them on the readings page.
 *
 * Same ingest is available at **`POST /api/hydrological/readings/ingest`** (POST-only path for field apps).
 *
 * **Auth (when `HYDRO_API_KEY` is set in `.env.local`):** field apps send the same value as
 * `X-Hydro-Api-Key`, `X-Api-Key`, or `Authorization: Bearer <key>`. Browser ERP users may instead use the
 * demo session (`X-Acting-User-Id` / `nwrma_acting_user_id` cookie). If `HYDRO_API_KEY` is unset, POST is allowed without auth (local dev only).
 *
 * **Body:** `application/json`, **`application/x-www-form-urlencoded`**, or **`multipart/form-data`** (string fields).
 * Field names (camelCase or snake_case): `stationId` / `station_id`, `gaugeOfficerId` / `gauge_officer_id`,
 * numeric water level via `levelM`, `water_level`, `stage_m`, etc. If the station is not in the ERP catalog,
 * the field app must also send `stationName` / `station_name` (optional `stationDistrict`). Timestamps: ISO strings,
 * Unix ms/sec, or `reading_date` + `reading_time`. GPS: `gps_location` or `latitude` + `longitude`. Optional:
 * `location`, `gaugePhotoUrl`, `qualityFlag`, `hodValidation`, `createdBy`. JSON may nest fields under `reading`, `data`, or `payload`.
 *
 * Do **not** put readings from the phone straight into Postgres with a raw client: use this endpoint with
 * `HYDRO_API_KEY` so `stationId`, officer ids, and timestamps are validated (avoids `"null"` strings and invalid dates).
 */
export async function POST(req: Request) {
  return respondWithHydrologicalReadingIngest(req)
}
