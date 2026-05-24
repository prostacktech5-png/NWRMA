import { z } from 'zod'
import prisma from '../prisma/client.js'
import { mirrorFieldReportToWaterLevelReading } from './hydro-water-level-mirror.js'

export const reportBodySchema = z.object({
  clientLocalId: z.string().nullable().optional(),
  officerName: z.string(),
  officerPhone: z.string(),
  riverName: z.string().nullable().optional(),
  location: z.string(),
  waterLevel: z.coerce.number().finite(),
  readingTime: z.string(),
  date: z.string(),
  dateTime: z.string(),
  gpsLat: z.number().nullable().optional(),
  gpsLng: z.number().nullable().optional(),
  photoBase64: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
})

export type ReportBodyPayload = z.infer<typeof reportBodySchema>

export async function persistFieldReport(userId: string, input: ReportBodyPayload) {
  const dateTime = new Date(input.dateTime)
  if (Number.isNaN(dateTime.getTime())) {
    throw Object.assign(new Error('Invalid dateTime'), { status: 400 })
  }

  const data = {
    userId,
    officerName: input.officerName,
    officerPhone: input.officerPhone,
    riverName: input.riverName ?? null,
    location: input.location,
    waterLevel: input.waterLevel,
    readingTime: input.readingTime,
    date: input.date,
    dateTime,
    gpsLat: input.gpsLat ?? null,
    gpsLng: input.gpsLng ?? null,
    photoBase64: input.photoBase64 ?? null,
    remarks: input.remarks ?? null,
    clientLocalId: input.clientLocalId ?? null,
  }

  return prisma.$transaction(async (tx) => {
    const saved = input.clientLocalId
      ? await tx.fieldReport.upsert({
          where: { clientLocalId: input.clientLocalId },
          update: data,
          create: {
            ...data,
            clientLocalId: input.clientLocalId,
          },
        })
      : await tx.fieldReport.create({ data })

    const readingId = input.clientLocalId ?? saved.id
    await mirrorFieldReportToWaterLevelReading(tx, userId, readingId, {
      officerPhone: input.officerPhone,
      officerName: input.officerName,
      riverName: input.riverName,
      location: input.location,
      waterLevel: Number(input.waterLevel),
      dateTime,
      gpsLat: input.gpsLat,
      gpsLng: input.gpsLng,
    })

    return saved
  })
}
