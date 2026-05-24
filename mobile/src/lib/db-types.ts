export interface User {
  id: string
  phone: string
  name: string
  password: string
  createdAt: string
}

export interface WaterReading {
  id: string
  officerName: string
  officerPhone: string
  location: string
  riverName: string
  waterLevel: number
  readingTime: string
  date: string
  dateTime: string
  gpsLat: number | null
  gpsLng: number | null
  photoBase64: string | null
  remarks: string
  syncStatus: 'pending' | 'synced' | 'failed'
  syncError?: string
  createdAt: string
  syncedAt?: string
}

export interface SyncLog {
  id: string
  readingId: string
  status: 'success' | 'failed'
  error?: string
  timestamp: string
}

export const RIVER_OTHER_VALUE = '__other__' as const
export const RIVER_OPTION_SEPARATOR = ' – ' as const

export function parseRiverLocationOption(option: string): { riverName: string; areaLabel: string } {
  const sep = RIVER_OPTION_SEPARATOR
  const i = option.indexOf(sep)
  if (i === -1) {
    return { riverName: option.trim(), areaLabel: '' }
  }
  return {
    riverName: option.slice(0, i).trim(),
    areaLabel: option.slice(i + sep.length).trim(),
  }
}

export const RIVER_LOCATION_OPTIONS = [
  'Bagbe River – Bo',
  'Bafi River – Kenema',
  'Bankasoka River – Port Loko',
  'Bumpeh River – Moyamba',
  'Great Scarcies River (Kolenté River) – Kambia',
  'Great Scarcies River (Kolenté River) – Port Loko',
  'Jong River (Taia River) – Moyamba',
  'Jong River (Taia River) – Bonthe',
  'Kagboro River – Moyamba',
  'Kissi River – Kailahun',
  'Kukuna River – Kenema',
  'Little Scarcies River (Kaba River) – Kambia',
  'Mahoi River – Bo',
  'Mano River – Kambia',
  'Moa River – Kailahun',
  'Moa River – Pujehun',
  'Moro River – Pujehun',
  'Pampana River – Tonkolili',
  'Rokel River (Seli River) – Magburaka',
  'Rokel River (Seli River) – Bumbuna',
  'Rokel River (Seli River) – Makeni',
  'Sewa River – Bo',
  'Sewa River – Kenema',
  'Sherbro River – Bonthe',
  'Sierra Leone River (estuary) – Freetown',
  'Teye River – Kenema',
  'Waanje River (Wanje River) – Pujehun',
] as const
