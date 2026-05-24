import { getSql } from '@/lib/db'
import { HydroPaymentStore } from '@/lib/hydro-payment-store'
import type {
  GaugeOfficer,
  HodReadingValidation,
  HydrologicalSettings,
  HydroPaymentAuditEvent,
  OfficerPayment,
  WaterLevelReading,
} from '@/lib/types'

const DEFAULT_SETTINGS: HydrologicalSettings = {
  perReadingRateSle: 50_000,
  fieldAppKey: '',
}

/** Driver may return ISO strings, `Date`, or timestamps; bad rows must not produce Invalid Date. */
function coerceDbInstant(value: unknown): Date {
  if (value == null || value === '') return new Date(0)
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? new Date(0) : value
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value > 1e12 ? value : value > 1e9 ? value * 1000 : value
    const d = new Date(ms)
    return Number.isNaN(d.getTime()) ? new Date(0) : d
  }
  const d = new Date(String(value))
  return Number.isNaN(d.getTime()) ? new Date(0) : d
}

function rowOfficer(r: Record<string, unknown>): GaugeOfficer {
  return {
    id: String(r.id),
    fullName: String(r.full_name),
    phone: String(r.phone),
    linkedUserId: r.linked_user_id != null ? String(r.linked_user_id) : null,
    fieldAppKey: String(r.field_app_key),
  }
}

function coerceDbLevel(value: unknown): number {
  if (value == null || value === '') return 0
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const n = Number(String(value).trim().replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function rowReading(r: Record<string, unknown>): WaterLevelReading {
  const row = r
  const hv = String(row.hod_validation) as HodReadingValidation
  const qf = row.quality_flag != null ? String(row.quality_flag) : null
  return {
    id: String(row.id),
    stationId: String(row.station_id),
    stationName: String(row.station_name),
    officerName: String(row.officer_name),
    phoneNumber: String(row.phone_number),
    gaugeOfficerId: String(row.gauge_officer_id),
    hodValidation: hv === 'pending' || hv === 'valid' || hv === 'rejected' ? hv : 'pending',
    location: String(row.location),
    measuredAt: coerceDbInstant(row.measured_at ?? row.measuredAt),
    levelM: coerceDbLevel(row.level_m ?? row.levelM),
    gpsLocation: String(row.gps_location ?? row.gpsLocation ?? ''),
    gaugePhotoUrl: row.gauge_photo_url != null ? String(row.gauge_photo_url) : null,
    qualityFlag:
      qf === 'good' || qf === 'suspect' || qf === 'poor' ? qf : qf ? 'good' : null,
    source: (() => {
      const s = String(row.source)
      if (s === 'import') return 'import'
      if (s === 'field_app') return 'field_app'
      return 'manual'
    })(),
    createdBy: String(row.created_by),
    createdAt: coerceDbInstant(row.created_at ?? row.createdAt),
  }
}

function rowPayment(r: Record<string, unknown>): OfficerPayment {
  return {
    id: String(r.id),
    gaugeOfficerId: String(r.gauge_officer_id),
    officerName: String(r.officer_name),
    yearMonth: String(r.year_month),
    validSubmissions: Number(r.valid_submissions),
    rateSle: Number(r.rate_sle),
    totalSle: Number(r.total_sle),
    status: String(r.status) as OfficerPayment['status'],
    submittedAt: r.submitted_at != null ? new Date(String(r.submitted_at)) : null,
    approvedAt: r.approved_at != null ? new Date(String(r.approved_at)) : null,
    disbursedAt: r.disbursed_at != null ? new Date(String(r.disbursed_at)) : null,
    approvedByUserId: r.approved_by_user_id != null ? String(r.approved_by_user_id) : null,
    disbursedByUserId: r.disbursed_by_user_id != null ? String(r.disbursed_by_user_id) : null,
  }
}

function rowAudit(r: Record<string, unknown>): HydroPaymentAuditEvent {
  return {
    id: String(r.id),
    paymentId: String(r.payment_id),
    action: String(r.action) as HydroPaymentAuditEvent['action'],
    at: new Date(String(r.at)),
    byUserId: String(r.by_user_id),
  }
}

export async function loadHydroPaymentStoreFromDatabase(): Promise<HydroPaymentStore> {
  const sql = getSql()
  const officerRows = (await sql`SELECT * FROM gauge_officers ORDER BY id`) as Record<string, unknown>[]
  const readings = (await sql`SELECT * FROM water_level_readings ORDER BY measured_at DESC`) as Record<
    string,
    unknown
  >[]
  const paymentRows = (await sql`SELECT * FROM officer_payments`) as Record<string, unknown>[]
  const auditRows = (await sql`SELECT * FROM hydro_payment_audit ORDER BY at`) as Record<string, unknown>[]
  const settingsRows = (await sql`SELECT * FROM hydrological_settings WHERE id = 1`) as Record<
    string,
    unknown
  >[]
  const settings: HydrologicalSettings =
    settingsRows[0] != null
      ? {
          perReadingRateSle: Number(settingsRows[0].per_reading_rate_sle),
          fieldAppKey: String(settingsRows[0].field_app_key),
        }
      : DEFAULT_SETTINGS

  return HydroPaymentStore.fromPersisted(
    readings.map(rowReading),
    paymentRows.map(rowPayment),
    settings,
    officerRows.map(rowOfficer),
    auditRows.map(rowAudit)
  )
}

export async function saveHydroPaymentStoreToDatabase(store: HydroPaymentStore): Promise<void> {
  const sql = getSql()
  await sql`DELETE FROM hydro_payment_audit`
  await sql`DELETE FROM officer_payments`
  await sql`DELETE FROM water_level_readings`
  await sql`DELETE FROM gauge_officers`

  await sql`
    INSERT INTO hydrological_settings (id, per_reading_rate_sle, field_app_key)
    VALUES (1, ${store.settings.perReadingRateSle}, ${store.settings.fieldAppKey})
    ON CONFLICT (id) DO UPDATE SET
      per_reading_rate_sle = EXCLUDED.per_reading_rate_sle,
      field_app_key = EXCLUDED.field_app_key
  `

  for (const o of store.officers) {
    await sql`
      INSERT INTO gauge_officers (id, full_name, phone, linked_user_id, field_app_key)
      VALUES (${o.id}, ${o.fullName}, ${o.phone}, ${o.linkedUserId}, ${o.fieldAppKey})
    `
  }

  for (const r of store.readings) {
    await sql`
      INSERT INTO water_level_readings (
        id, station_id, station_name, officer_name, phone_number, gauge_officer_id,
        hod_validation, location, measured_at, level_m, gps_location, gauge_photo_url,
        quality_flag, source, created_by, created_at
      ) VALUES (
        ${r.id},
        ${r.stationId},
        ${r.stationName},
        ${r.officerName},
        ${r.phoneNumber},
        ${r.gaugeOfficerId},
        ${r.hodValidation},
        ${r.location},
        ${r.measuredAt.toISOString()},
        ${r.levelM},
        ${r.gpsLocation},
        ${r.gaugePhotoUrl ?? null},
        ${r.qualityFlag ?? null},
        ${r.source},
        ${r.createdBy},
        ${r.createdAt.toISOString()}
      )
    `
  }

  for (const p of store.payments) {
    await sql`
      INSERT INTO officer_payments (
        id, gauge_officer_id, officer_name, year_month, valid_submissions, rate_sle, total_sle,
        status, submitted_at, approved_at, disbursed_at, approved_by_user_id, disbursed_by_user_id
      ) VALUES (
        ${p.id},
        ${p.gaugeOfficerId},
        ${p.officerName},
        ${p.yearMonth},
        ${p.validSubmissions},
        ${p.rateSle},
        ${p.totalSle},
        ${p.status},
        ${p.submittedAt?.toISOString() ?? null},
        ${p.approvedAt?.toISOString() ?? null},
        ${p.disbursedAt?.toISOString() ?? null},
        ${p.approvedByUserId},
        ${p.disbursedByUserId}
      )
    `
  }

  for (const a of store.audit) {
    await sql`
      INSERT INTO hydro_payment_audit (id, payment_id, action, at, by_user_id)
      VALUES (${a.id}, ${a.paymentId}, ${a.action}, ${a.at.toISOString()}, ${a.byUserId})
    `
  }
}
