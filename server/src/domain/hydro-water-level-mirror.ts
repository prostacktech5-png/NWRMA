import type { Prisma } from '@prisma/client'

function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, '')
}

function phonesRoughlyEqual(a: string, b: string): boolean {
  const da = digitsOnly(a)
  const db = digitsOnly(b)
  if (!da || !db) return false
  if (da === db) return true
  if (da.length >= 8 && db.length >= 8) {
    return da.slice(-9) === db.slice(-9)
  }
  return false
}

function slugStationId(river: string, location: string): string {
  const raw = `${river}|${location}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)
  return raw ? `mob-${raw}` : `mob-${Date.now()}`
}

type OfficerRow = {
  id: string
  full_name: string
  phone: string
  linked_user_id: string | null
}

export async function mirrorFieldReportToWaterLevelReading(
  tx: Prisma.TransactionClient,
  userId: string,
  readingId: string,
  input: {
    officerPhone: string
    officerName: string
    riverName: string | null | undefined
    location: string
    waterLevel: number
    dateTime: Date
    gpsLat: number | null | undefined
    gpsLng: number | null | undefined
  }
): Promise<void> {
  const officerRows = await tx.$queryRaw<OfficerRow[]>`
    SELECT id, full_name, phone, linked_user_id FROM gauge_officers
  `

  let match = officerRows.find((o) => phonesRoughlyEqual(o.phone, input.officerPhone))
  if (!match) {
    match = officerRows.find((o) => o.linked_user_id != null && o.linked_user_id === userId)
  }

  /** HoD may not have added gauge officers yet — link this ERP user so field sync always lands in Hydrological readings. */
  if (!match) {
    const user = await tx.user.findUnique({ where: { id: userId } })
    const phone = (user?.phone?.trim() || input.officerPhone.trim()).trim()
    const fullName = (user?.fullName?.trim() || input.officerName.trim()).trim()
    if (!phone || !fullName) {
      throw new Error(
        'Cannot sync: your ERP account needs a phone number, or register/login with phone so readings can be attributed.'
      )
    }
    const autoId = `go-auto-${userId}`
    await tx.$executeRaw`
      INSERT INTO gauge_officers (id, full_name, phone, linked_user_id, field_app_key)
      VALUES (${autoId}, ${fullName}, ${phone}, ${userId}, ${'auto-field-sync'})
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        linked_user_id = EXCLUDED.linked_user_id,
        field_app_key = EXCLUDED.field_app_key
    `
    match = {
      id: autoId,
      full_name: fullName,
      phone,
      linked_user_id: userId,
    }
  }

  const river = (input.riverName ?? '').trim()
  const loc = input.location.trim()
  const stationId = slugStationId(river || 'field-site', loc)
  const stationName = river ? `${river} — ${loc}` : loc

  const gps =
    input.gpsLat != null && input.gpsLng != null ? `${input.gpsLat}, ${input.gpsLng}` : ''

  const measuredAt = input.dateTime
  const levelM = input.waterLevel

  await tx.$executeRaw`
    INSERT INTO water_level_readings (
      id,
      station_id,
      station_name,
      officer_name,
      phone_number,
      gauge_officer_id,
      hod_validation,
      location,
      measured_at,
      level_m,
      gps_location,
      gauge_photo_url,
      quality_flag,
      source,
      created_by,
      created_at
    )
    VALUES (
      ${readingId},
      ${stationId},
      ${stationName},
      ${match.full_name},
      ${match.phone},
      ${match.id},
      'pending',
      ${loc},
      ${measuredAt},
      ${levelM},
      ${gps},
      NULL,
      'good',
      'field_app',
      ${match.full_name},
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      station_id = EXCLUDED.station_id,
      station_name = EXCLUDED.station_name,
      officer_name = EXCLUDED.officer_name,
      phone_number = EXCLUDED.phone_number,
      gauge_officer_id = EXCLUDED.gauge_officer_id,
      hod_validation = EXCLUDED.hod_validation,
      location = EXCLUDED.location,
      measured_at = EXCLUDED.measured_at,
      level_m = EXCLUDED.level_m,
      gps_location = EXCLUDED.gps_location,
      quality_flag = EXCLUDED.quality_flag,
      source = EXCLUDED.source,
      created_by = EXCLUDED.created_by,
      created_at = EXCLUDED.created_at
  `
}
