import type { OfficerPayment, WaterLevelReading } from '@/lib/types'

function instantToIso(value: unknown): string {
  if (value == null || value === '') return new Date(0).toISOString()
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? new Date(0).toISOString() : value.toISOString()
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString()
  }
  const d = new Date(String(value))
  return Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString()
}

export function readingToJson(r: WaterLevelReading) {
  return {
    id: r.id,
    stationId: r.stationId,
    stationName: r.stationName,
    officerName: r.officerName,
    phoneNumber: r.phoneNumber,
    gaugeOfficerId: r.gaugeOfficerId,
    hodValidation: r.hodValidation,
    location: r.location,
    levelM: r.levelM,
    gpsLocation: r.gpsLocation ?? '',
    gaugePhotoUrl: r.gaugePhotoUrl ?? null,
    qualityFlag: r.qualityFlag ?? null,
    source: r.source,
    createdBy: r.createdBy,
    measuredAt: instantToIso(r.measuredAt),
    createdAt: instantToIso(r.createdAt),
  }
}

export function paymentToJson(p: OfficerPayment) {
  return {
    ...p,
    submittedAt: p.submittedAt ? new Date(p.submittedAt).toISOString() : null,
    approvedAt: p.approvedAt ? new Date(p.approvedAt).toISOString() : null,
    disbursedAt: p.disbursedAt ? new Date(p.disbursedAt).toISOString() : null,
  }
}
