/**
 * Water readings stored in AsyncStorage — avoids expo-sqlite Android bind issues on INSERT.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { WaterReading } from './db-types'

const READINGS_KEY = 'hydrogauge_readings_v2'

export function normalizeReading(r: WaterReading): WaterReading {
  return {
    id: String(r.id),
    officerName: String(r.officerName ?? ''),
    officerPhone: String(r.officerPhone ?? ''),
    location: String(r.location ?? ''),
    riverName: String(r.riverName ?? ''),
    waterLevel: Number(r.waterLevel) || 0,
    readingTime: String(r.readingTime ?? ''),
    date: String(r.date ?? ''),
    dateTime: String(r.dateTime ?? ''),
    gpsLat:
      r.gpsLat === null || r.gpsLat === undefined || r.gpsLat === ('' as unknown)
        ? null
        : Number(r.gpsLat),
    gpsLng:
      r.gpsLng === null || r.gpsLng === undefined || r.gpsLng === ('' as unknown)
        ? null
        : Number(r.gpsLng),
    photoBase64:
      typeof r.photoBase64 === 'string'
        ? r.photoBase64
        : r.photoBase64 == null
          ? null
          : null,
    remarks: typeof r.remarks === 'string' ? r.remarks : '',
    syncStatus:
      r.syncStatus === 'synced' || r.syncStatus === 'failed' ? r.syncStatus : 'pending',
    syncError: typeof r.syncError === 'string' ? r.syncError : undefined,
    createdAt: String(r.createdAt ?? new Date().toISOString()),
    syncedAt: typeof r.syncedAt === 'string' ? r.syncedAt : undefined,
  }
}

export async function loadReadings(): Promise<WaterReading[]> {
  const raw = await AsyncStorage.getItem(READINGS_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.map((item) => normalizeReading(item as WaterReading))
  } catch {
    return []
  }
}

export async function saveReadings(readings: WaterReading[]): Promise<void> {
  await AsyncStorage.setItem(READINGS_KEY, JSON.stringify(readings.map(normalizeReading)))
}

export async function upsertReading(record: WaterReading): Promise<void> {
  const r = normalizeReading(record)
  const list = await loadReadings()
  const i = list.findIndex((x) => x.id === r.id)
  if (i >= 0) list[i] = r
  else list.unshift(r)
  await saveReadings(list)
}

export async function patchReading(
  id: string,
  patch: Partial<WaterReading>,
): Promise<void> {
  const list = await loadReadings()
  const i = list.findIndex((x) => x.id === id)
  if (i < 0) return
  list[i] = normalizeReading({ ...list[i], ...patch })
  await saveReadings(list)
}

export async function readingsForPhone(phone: string): Promise<WaterReading[]> {
  const p = phone.trim()
  return (await loadReadings()).filter((r) => r.officerPhone.trim() === p)
}

export async function deleteReadingsForPhone(phone: string): Promise<void> {
  const p = phone.trim()
  const list = (await loadReadings()).filter((r) => r.officerPhone.trim() !== p)
  await saveReadings(list)
}
