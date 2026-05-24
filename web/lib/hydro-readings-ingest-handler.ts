import { tryRespondWithDbSetupHint } from '@/lib/db'
import { loadOrSeedErpReferencePayload } from '@/lib/db/reference-data-persistence'
import { readingToJson } from '@/lib/hydro-api-json'
import { authorizeReadingIngest } from '@/lib/hydro-api-key'
import {
  isPlaceholderIngestId,
  parseIngestBodyFromRequest,
  pickGpsForIngest,
  pickLevelMForIngest,
  pickMeasuredAtForIngest,
  pickStr,
  resolveStationForReadingIngest,
} from '@/lib/hydro-ingest-body'
import { commitHydroPaymentStore, getHydroPaymentStore } from '@/lib/hydro-payment-store'
import { findGaugeOfficerByPhone } from '@/lib/phone-match'
import type { HodReadingValidation } from '@/lib/types'

/**
 * Shared **POST** handler for hydrological reading ingest. Used by `POST /api/hydrological/readings` and
 * `POST /api/hydrological/readings/ingest`.
 */
export async function respondWithHydrologicalReadingIngest(req: Request): Promise<Response> {
  return tryRespondWithDbSetupHint(async () => {
    const ingestAuth = await authorizeReadingIngest(req)
    if (!ingestAuth.authorized) {
      return Response.json(
        {
          error: 'unauthorized',
          hint:
            'Send X-Hydro-Api-Key or Authorization: Bearer with the value of HYDRO_API_KEY, or sign in so X-Acting-User-Id / demo session cookie is sent.',
        },
        { status: 401 },
      )
    }

    const store = await getHydroPaymentStore()

    const parsed = await parseIngestBodyFromRequest(req)
    if (!parsed.ok) {
      const error =
        parsed.reason === 'invalid_json' ? 'invalid_json' : 'invalid_body'
      const hint =
        parsed.reason === 'empty_body'
          ? 'Send a JSON object, or form fields (application/x-www-form-urlencoded / multipart), with stationId, gauge officer id or officer phone, and water level.'
          : parsed.reason === 'invalid_json'
            ? 'Body must be valid JSON when using application/json (or omit Content-Type).'
            : 'Body must be JSON, application/x-www-form-urlencoded, or multipart/form-data with field names matching the ingest docs.'
      return Response.json({ error, hint }, { status: 400 })
    }

    const body = parsed.body

    const stationId = pickStr(body, 'stationId', 'station_id').trim()
    let gaugeOfficerId = pickStr(body, 'gaugeOfficerId', 'gauge_officer_id').trim()
    const levelM = pickLevelMForIngest(body)

    if (isPlaceholderIngestId(stationId) || !Number.isFinite(levelM)) {
      return Response.json(
        {
          error: 'invalid_body',
          hint:
            'Send stationId and a numeric water level (levelM, level_m, water_level, stage_m, …). Send gaugeOfficerId or (with Hydro API key) officerPhone / phone_number matching a Gauge Officer record.',
        },
        { status: 400 },
      )
    }

    if (isPlaceholderIngestId(gaugeOfficerId) && ingestAuth.viaApiKey) {
      const phone = pickStr(
        body,
        'officerPhone',
        'officer_phone',
        'phone_number',
        'phoneNumber',
        'phone'
      ).trim()
      const byPhone = phone ? findGaugeOfficerByPhone(store.officers, phone) : undefined
      if (byPhone) gaugeOfficerId = byPhone.id
    }

    if (isPlaceholderIngestId(gaugeOfficerId)) {
      return Response.json(
        {
          error: 'invalid_body',
          hint:
            'Send gaugeOfficerId, or officerPhone / phone_number when using X-Hydro-Api-Key so the ERP can match a Gauge Officer.',
        },
        { status: 400 },
      )
    }

    const { monitoringStations } = await loadOrSeedErpReferencePayload()

    const stationName = pickStr(body, 'stationName', 'station_name').trim()
    const stationDistrict = pickStr(body, 'stationDistrict', 'station_district').trim()
    const resolved = resolveStationForReadingIngest(monitoringStations, {
      stationId,
      stationName,
      stationDistrict,
      viaApiKey: ingestAuth.viaApiKey,
    })
    if (!resolved.ok) {
      return Response.json({ error: resolved.error, hint: resolved.hint }, { status: 400 })
    }
    const station = resolved.station

    const officer = store.findOfficerById(gaugeOfficerId)
    if (!officer) {
      return Response.json({ error: 'unknown_officer' }, { status: 400 })
    }

    const clientReadingId = pickStr(body, 'id', 'readingId', 'clientLocalId').trim()
    if (clientReadingId && !isPlaceholderIngestId(clientReadingId)) {
      const existing = store.readings.find((r) => r.id === clientReadingId)
      if (existing) {
        return Response.json({ reading: readingToJson(existing), idempotent: true })
      }
    }

    const hodRaw = body.hodValidation ?? body.hod_validation
    const hodValidation: HodReadingValidation =
      hodRaw === 'pending' || hodRaw === 'valid' || hodRaw === 'rejected' ? hodRaw : 'pending'

    if (hodValidation === 'rejected') {
      return Response.json({ error: 'cannot_ingest_as_rejected' }, { status: 400 })
    }

    const measuredAt = pickMeasuredAtForIngest(body)

    const locationRaw = pickStr(body, 'location')
    const gpsRaw = pickGpsForIngest(body)
    const photoRaw = pickStr(body, 'gaugePhotoUrl', 'gauge_photo_url')
    const qualityRaw = body.qualityFlag ?? body.quality_flag
    const createdByRaw = pickStr(body, 'createdBy', 'created_by')

    const reading = store.appendReading({
      id:
        clientReadingId && !isPlaceholderIngestId(clientReadingId) ? clientReadingId : undefined,
      stationId: station.id,
      stationName: station.name,
      officerName: officer.fullName,
      phoneNumber: officer.phone,
      gaugeOfficerId: officer.id,
      hodValidation,
      location: locationRaw || station.district,
      measuredAt,
      levelM,
      gpsLocation: gpsRaw,
      gaugePhotoUrl: photoRaw || null,
      qualityFlag:
        qualityRaw === 'good' || qualityRaw === 'suspect' || qualityRaw === 'poor' ? qualityRaw : 'good',
      source: ingestAuth.viaApiKey ? 'field_app' : 'manual',
      createdBy: createdByRaw && !isPlaceholderIngestId(createdByRaw) ? createdByRaw.trim() : officer.fullName,
    })

    await commitHydroPaymentStore(store)
    return Response.json({ reading: readingToJson(reading) })
  })
}
