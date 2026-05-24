import type { WaterLevelBand } from './water-level.js'

export interface AuthUserPayload {
  id: string
  email: string | null
  phone: string | null
  fullName: string
  role: string
  department: string | null
}

export interface LoginSuccessResponse {
  token: string
  user: AuthUserPayload
}

export type HodValidationSync = 'pending' | 'valid' | 'rejected'

/** Report body shared by REST payloads and SQLite rows (camelCase JSON). */
export interface FieldReportInput {
  clientLocalId?: string | null
  officerName: string
  officerPhone: string
  riverName?: string | null
  location: string
  waterLevel: number
  readingTime: string
  date: string
  dateTime: string
  gpsLat?: number | null
  gpsLng?: number | null
  photoBase64?: string | null
  remarks?: string | null
}

export interface FieldReportResponse extends FieldReportInput {
  id: string
  userId: string
  hodValidation: HodValidationSync
  band: WaterLevelBand
  createdAt: string
}
