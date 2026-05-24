import { randomUUID } from 'crypto'
import type {
  GaugeOfficer,
  HodReadingValidation,
  HydrologicalSettings,
  HydroPaymentAuditEvent,
  OfficerPayment,
  WaterLevelReading,
} from '@/lib/types'
const EMPTY_SETTINGS: HydrologicalSettings = {
  perReadingRateSle: 50_000,
  fieldAppKey: '',
}

export function yearMonthFromDate(d: Date): string {
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  return `${y}-${String(m).padStart(2, '0')}`
}

function deepCloneDates<T>(t: T): T {
  return structuredClone(t) as T
}

type ApproveDisburseResult =
  | { ok: true; payment: OfficerPayment }
  | { ok: false; code: 'not_found' | 'conflict' | 'invalid_state'; message: string }

export class HydroPaymentStore {
  readings: WaterLevelReading[]
  payments: OfficerPayment[]
  settings: HydrologicalSettings
  officers: GaugeOfficer[]
  audit: HydroPaymentAuditEvent[]

  private constructor(
    readings: WaterLevelReading[],
    payments: OfficerPayment[],
    settings: HydrologicalSettings,
    officers: GaugeOfficer[]
  ) {
    this.readings = readings
    this.payments = payments
    this.settings = settings
    this.officers = officers
    this.audit = []
  }

  static createFresh(): HydroPaymentStore {
    return HydroPaymentStore.fromPersisted([], [], deepCloneDates(EMPTY_SETTINGS), [], [])
  }

  findOfficerById(id: string): GaugeOfficer | undefined {
    return this.officers.find((o) => o.id === id)
  }

  /**
   * Accrual: only HoD-**valid** readings in the calendar month count. Pending and rejected never affect totals.
   * Each valid reading pays `perReadingRateSle` once. Disbursed lines are not auto-adjusted (frozen payout).
   */
  syncPaymentForOfficerMonth(gaugeOfficerId: string, yearMonth: string): void {
    const rate = this.settings.perReadingRateSle
    const officer = this.findOfficerById(gaugeOfficerId)
    const officerName = officer?.fullName ?? 'Unknown officer'

    const validCount = this.readings.filter((r) => {
      const m = yearMonthFromDate(new Date(r.measuredAt))
      return (
        r.gaugeOfficerId === gaugeOfficerId &&
        m === yearMonth &&
        r.hodValidation === 'valid'
      )
    }).length

    const existing = this.payments.find(
      (p) => p.gaugeOfficerId === gaugeOfficerId && p.yearMonth === yearMonth
    )

    if (validCount === 0) {
      if (existing) {
        if (existing.status === 'pending' || existing.status === 'submitted') {
          this.payments = this.payments.filter((p) => p.id !== existing.id)
        } else if (existing.status === 'approved') {
          existing.validSubmissions = 0
          existing.rateSle = rate
          existing.totalSle = 0
        }
      }
      return
    }

    if (!existing) {
      this.payments.push({
        id: `pay-${randomUUID()}`,
        gaugeOfficerId,
        officerName,
        yearMonth,
        validSubmissions: validCount,
        rateSle: rate,
        totalSle: validCount * rate,
        status: 'pending',
        submittedAt: null,
        approvedAt: null,
        disbursedAt: null,
        approvedByUserId: null,
        disbursedByUserId: null,
      })
      return
    }

    if (existing.status === 'disbursed') {
      return
    }

    existing.validSubmissions = validCount
    existing.officerName = officerName
    existing.rateSle = rate
    existing.totalSle = validCount * rate
  }

  /** Recompute accrual for every open payment line and every month that has at least one valid reading. */
  refreshAllPendingFromReadings(): void {
    const seen = new Set<string>()
    const touch = (gaugeOfficerId: string, yearMonth: string) => {
      const k = `${gaugeOfficerId}|${yearMonth}`
      if (seen.has(k)) return
      seen.add(k)
      this.syncPaymentForOfficerMonth(gaugeOfficerId, yearMonth)
    }

    for (const p of this.payments) {
      if (p.status === 'disbursed') continue
      touch(p.gaugeOfficerId, p.yearMonth)
    }

    for (const r of this.readings) {
      if (r.hodValidation !== 'valid') continue
      touch(r.gaugeOfficerId, yearMonthFromDate(new Date(r.measuredAt)))
    }
  }

  /**
   * Ingest a new gauge reading. Defaults to HoD **pending** until validated on the readings page; only
   * **valid** rows feed monitoring and payroll accrual.
   */
  appendReading(
    input: Omit<WaterLevelReading, 'id' | 'createdAt'> & {
      id?: string
      createdAt?: Date
    }
  ): WaterLevelReading {
    const id = input.id ?? `rdg-${randomUUID()}`
    const now = new Date()
    const row: WaterLevelReading = {
      id,
      stationId: input.stationId,
      stationName: input.stationName,
      officerName: input.officerName,
      phoneNumber: input.phoneNumber,
      gaugeOfficerId: input.gaugeOfficerId,
      hodValidation: input.hodValidation ?? 'pending',
      location: input.location,
      measuredAt: input.measuredAt,
      levelM: input.levelM,
      gpsLocation: input.gpsLocation,
      gaugePhotoUrl: input.gaugePhotoUrl ?? null,
      qualityFlag: input.qualityFlag ?? 'good',
      source: input.source ?? 'manual',
      createdBy: input.createdBy,
      createdAt: input.createdAt ?? now,
    }
    this.readings.push(row)
    const ym = yearMonthFromDate(new Date(row.measuredAt))
    this.syncPaymentForOfficerMonth(row.gaugeOfficerId, ym)
    return row
  }

  setReadingValidation(
    readingId: string,
    hodValidation: Extract<HodReadingValidation, 'valid' | 'rejected'>
  ): WaterLevelReading | null {
    const r = this.readings.find((x) => x.id === readingId)
    if (!r) return null
    r.hodValidation = hodValidation
    const ym = yearMonthFromDate(new Date(r.measuredAt))
    this.syncPaymentForOfficerMonth(r.gaugeOfficerId, ym)
    return r
  }

  bulkSubmitMonth(yearMonth: string): { updated: number } {
    let updated = 0
    for (const p of this.payments) {
      if (p.yearMonth === yearMonth && p.status === 'pending') {
        p.status = 'submitted'
        p.submittedAt = new Date()
        updated += 1
      }
    }
    return { updated }
  }

  approve(paymentId: string, byUserId: string): ApproveDisburseResult {
    const p = this.payments.find((x) => x.id === paymentId)
    if (!p) {
      return { ok: false, code: 'not_found', message: 'Payment not found.' }
    }
    if (p.status === 'approved' || p.status === 'disbursed') {
      return {
        ok: false,
        code: 'conflict',
        message: 'Payment already approved or disbursed.',
      }
    }
    if (p.status !== 'submitted') {
      return {
        ok: false,
        code: 'invalid_state',
        message: 'Approve is only allowed when status is submitted (DG approval).',
      }
    }
    p.status = 'approved'
    p.approvedAt = new Date()
    p.approvedByUserId = byUserId
    this.audit.push({
      id: `aud-${randomUUID()}`,
      paymentId: p.id,
      action: 'approve',
      at: new Date(),
      byUserId,
    })
    return { ok: true, payment: p }
  }

  disburse(paymentId: string, byUserId: string): ApproveDisburseResult {
    const p = this.payments.find((x) => x.id === paymentId)
    if (!p) {
      return { ok: false, code: 'not_found', message: 'Payment not found.' }
    }
    if (p.status === 'disbursed') {
      return {
        ok: false,
        code: 'conflict',
        message: 'Payment already marked disbursed.',
      }
    }
    if (p.status !== 'approved') {
      return {
        ok: false,
        code: 'invalid_state',
        message: 'Disburse is only allowed when status is approved.',
      }
    }
    p.status = 'disbursed'
    p.disbursedAt = new Date()
    p.disbursedByUserId = byUserId
    this.audit.push({
      id: `aud-${randomUUID()}`,
      paymentId: p.id,
      action: 'disburse',
      at: new Date(),
      byUserId,
    })
    return { ok: true, payment: p }
  }

  patchSettings(patch: Partial<HydrologicalSettings>): void {
    if (typeof patch.perReadingRateSle === 'number' && patch.perReadingRateSle >= 0) {
      this.settings.perReadingRateSle = patch.perReadingRateSle
    }
    if (typeof patch.fieldAppKey === 'string' && patch.fieldAppKey.length > 0) {
      this.settings.fieldAppKey = patch.fieldAppKey
    }
    this.refreshAllPendingFromReadings()
  }

  listPayments(filters: { yearMonth?: string; status?: string }): OfficerPayment[] {
    return this.payments.filter((p) => {
      if (filters.yearMonth && p.yearMonth !== filters.yearMonth) return false
      if (filters.status && p.status !== filters.status) return false
      return true
    })
  }

  metrics(): {
    byStatus: Record<string, { count: number; amount: number }>
    awaitingDisbursement: { count: number; amount: number }
    submittedToDg: { count: number; amount: number }
  } {
    const byStatus: Record<string, { count: number; amount: number }> = {
      pending: { count: 0, amount: 0 },
      submitted: { count: 0, amount: 0 },
      approved: { count: 0, amount: 0 },
      disbursed: { count: 0, amount: 0 },
    }
    const awaiting = { count: 0, amount: 0 }
    const submitted = { count: 0, amount: 0 }
    for (const p of this.payments) {
      const lane = byStatus[p.status]
      if (lane) {
        lane.count += 1
        lane.amount += p.totalSle
      }
      if (p.status === 'approved') {
        awaiting.count += 1
        awaiting.amount += p.totalSle
      }
      if (p.status === 'submitted') {
        submitted.count += 1
        submitted.amount += p.totalSle
      }
    }
    return {
      byStatus,
      awaitingDisbursement: awaiting,
      submittedToDg: submitted,
    }
  }

  static fromPersisted(
    readings: WaterLevelReading[],
    payments: OfficerPayment[],
    settings: HydrologicalSettings,
    officers: GaugeOfficer[],
    audit: HydroPaymentAuditEvent[]
  ): HydroPaymentStore {
    const store = new HydroPaymentStore(
      deepCloneDates(readings),
      deepCloneDates(payments),
      deepCloneDates(settings),
      deepCloneDates(officers)
    )
    store.audit = deepCloneDates(audit)
    store.refreshAllPendingFromReadings()
    return store
  }
}

export async function getHydroPaymentStore(): Promise<HydroPaymentStore> {
  const { loadHydroPaymentStoreFromDatabase } = await import('@/lib/db/hydro-persistence')
  return loadHydroPaymentStoreFromDatabase()
}

export async function commitHydroPaymentStore(store: HydroPaymentStore): Promise<void> {
  const { saveHydroPaymentStoreToDatabase } = await import('@/lib/db/hydro-persistence')
  await saveHydroPaymentStoreToDatabase(store)
}
