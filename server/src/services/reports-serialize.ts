import type { FieldReport } from '@prisma/client'
import { waterLevelBand, type FieldReportResponse } from '@nwrma/shared'

export function toLevelNumber(v: FieldReport['waterLevel']): number {
  return Number(String(v))
}

export function serializeReport(r: FieldReport): FieldReportResponse {
  const level = toLevelNumber(r.waterLevel)
  const hv = ['pending', 'valid', 'rejected'].includes(r.hodValidation)
    ? r.hodValidation
    : 'pending'
  return {
    id: r.id,
    clientLocalId: r.clientLocalId ?? undefined,
    userId: r.userId,
    officerName: r.officerName,
    officerPhone: r.officerPhone,
    riverName: r.riverName ?? undefined,
    location: r.location,
    waterLevel: level,
    readingTime: r.readingTime,
    date: r.date,
    dateTime: r.dateTime.toISOString(),
    gpsLat: r.gpsLat,
    gpsLng: r.gpsLng,
    photoBase64: r.photoBase64 ?? undefined,
    remarks: r.remarks ?? undefined,
    hodValidation: hv as FieldReportResponse['hodValidation'],
    band: waterLevelBand(level),
    createdAt: r.createdAt.toISOString(),
  }
}
