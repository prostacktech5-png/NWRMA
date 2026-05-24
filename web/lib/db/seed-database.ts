import bcrypt from 'bcryptjs'
import { saveHydroPaymentStoreToDatabase } from '@/lib/db/hydro-persistence'
import { HydroPaymentStore, yearMonthFromDate } from '@/lib/hydro-payment-store'
import { FinanceApiStore, commitFinanceApiStore } from '@/lib/finance-api-store'
import {
  gaugeOfficers,
  hydrologicalSettings,
  leaveRequests,
  officerPaymentsSeed,
  users,
  waterLevelReadings,
} from '@/lib/seed-demo-payloads'
import { getSql } from '@/lib/db'
import { saveDgLeaveStore } from '@/lib/dg-leave-store'
import { ensureAdministrativeData } from '@/lib/db/borehole-admin-persistence'
import { replaceErpReferencePayloadWithDefaults } from '@/lib/db/reference-data-persistence'

/**
 * Loads demo data into an existing PostgreSQL schema. Create tables in your database first;
 * this does not drop tables or apply DDL.
 */
export async function seedDatabaseFull(): Promise<void> {
  const sql = getSql()

  await sql`DELETE FROM hydro_payment_audit`
  await sql`DELETE FROM officer_payments`
  await sql`DELETE FROM water_level_readings`
  await sql`DELETE FROM gauge_officers`
  await sql`DELETE FROM hydrological_settings WHERE id = 1`
  await sql`DELETE FROM hydro_portal_requests`
  await sql`DELETE FROM hydro_portal_links`
  await sql`DELETE FROM finance_requisitions`
  await sql`DELETE FROM finance_funds_receipts`
  await sql`DELETE FROM finance_budgets`
  await sql`DELETE FROM leave_requests`
  /** Prisma `User` — matches server/auth; cascades remove linked FieldReports per FK. */
  await sql`DELETE FROM "User"`
  await sql`DELETE FROM app_meta WHERE key IN ('financial_public_staff_link', 'financial_public_per_diem_link')`

  for (const u of users) {
    const password = u.email.toLowerCase() === 'admin@nwrma.gov.sl' ? 'admin123' : 'demo123'
    const passwordHash = await bcrypt.hash(password, 10)
    await sql`
      INSERT INTO "User" (id, email, phone, "passwordHash", "fullName", role, department, "createdAt", "updatedAt")
      VALUES (
        ${u.id},
        ${u.email},
        null,
        ${passwordHash},
        ${u.name},
        ${u.role},
        ${u.department},
        now(),
        now()
      )
    `
  }

  const hydro = HydroPaymentStore.fromPersisted(
    structuredClone(waterLevelReadings),
    structuredClone(officerPaymentsSeed),
    { ...hydrologicalSettings },
    structuredClone(gaugeOfficers),
    []
  )

  /** Demo rows for the current calendar month so Officer Payments matches “today” after seeding. */
  const now = new Date()
  const ym = yearMonthFromDate(now)
  const hasCurrentMonthValid = hydro.readings.some(
    (r) =>
      r.hodValidation === 'valid' && yearMonthFromDate(new Date(r.measuredAt)) === ym
  )
  if (!hasCurrentMonthValid) {
    hydro.appendReading({
      id: `rdg-seed-${ym}-a`,
      stationId: 'sta-001',
      stationName: 'Freetown Central Station',
      officerName: 'Isatu Mansaray',
      phoneNumber: '+232 76 111223',
      gaugeOfficerId: 'go-001',
      hodValidation: 'valid',
      location: 'Seed demo — current month (officer incentives)',
      measuredAt: new Date(now.getFullYear(), now.getMonth(), 12, 8, 0, 0),
      levelM: 2.41,
      gpsLocation: '8.4521° N, 13.2897° W',
      gaugePhotoUrl: null,
      qualityFlag: 'good',
      source: 'manual',
      createdBy: 'seed-database',
      createdAt: now,
    })
    hydro.appendReading({
      id: `rdg-seed-${ym}-b`,
      stationId: 'sta-002',
      stationName: 'Rokel River Station',
      officerName: 'Ibrahim Koroma',
      phoneNumber: '+232 78 445566',
      gaugeOfficerId: 'go-002',
      hodValidation: 'valid',
      location: 'Seed demo — current month (officer incentives)',
      measuredAt: new Date(now.getFullYear(), now.getMonth(), 18, 9, 30, 0),
      levelM: 4.9,
      gpsLocation: '8.9456° N, 12.8422° W',
      gaugePhotoUrl: null,
      qualityFlag: 'good',
      source: 'manual',
      createdBy: 'seed-database',
      createdAt: now,
    })
    hydro.refreshAllPendingFromReadings()
  }

  await saveHydroPaymentStoreToDatabase(hydro)

  const fin = FinanceApiStore.createFresh()
  await commitFinanceApiStore(fin)

  await saveDgLeaveStore(leaveRequests)

  await replaceErpReferencePayloadWithDefaults()
  await ensureAdministrativeData()
}
