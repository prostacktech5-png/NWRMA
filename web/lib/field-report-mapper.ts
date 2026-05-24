import type { FieldReportResponse } from '@nwrma/shared'
import type { HodReadingValidation, WaterLevelReading } from '@/lib/types'

function pickHod(v: unknown): HodReadingValidation {
  if (v === 'valid' || v === 'rejected' || v === 'pending') return v
  return 'pending'
}

/** Maps backend field reports onto the Hydrological readings table row shape. */
export function fieldReportToWaterLevelReading(fr: FieldReportResponse): WaterLevelReading {
  const measuredAt = new Date(fr.dateTime)
  const createdAt =
    typeof fr.createdAt === 'string' ? new Date(fr.createdAt) : measuredAt

  const gpsParts =
    fr.gpsLat != null &&
    typeof fr.gpsLat === 'number' &&
    fr.gpsLng != null &&
    typeof fr.gpsLng === 'number'
      ? `${fr.gpsLat}, ${fr.gpsLng}`
      : ''

  const stationKey = (
    `${fr.riverName ?? ''}`.trim().toLowerCase() +
    '|' +
    `${fr.location}`.trim().toLowerCase()
  ).replace(/\s+/g, ' ')

  return {
    id: fr.id,
    stationId:
      stationKey.length > 0 ? `field:${stationKey.slice(0, 120)}` : `field:${fr.id}`,
    stationName: `${fr.riverName ?? ''}`.trim().length ? `River: ${fr.riverName}` : 'Field report',
    officerName: fr.officerName,
    phoneNumber: fr.officerPhone,
    gaugeOfficerId: 'nwrma-api',
    hodValidation: pickHod(fr.hodValidation),
    location: fr.location,
    measuredAt,
    levelM: fr.waterLevel,
    gpsLocation: gpsParts,
    gaugePhotoUrl: fr.photoBase64?.startsWith?.('http') ? fr.photoBase64 : null,
    qualityFlag: null,
    source: 'field_app',
    createdBy: fr.userId,
    createdAt,
  }
}
