import type { GaugeOfficer } from '@/lib/types'

/** Strip non-digits so “+232 76 …” matches “23276…”. */
export function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, '')
}

/** Loose match for international vs national formatting (last 9 digits). */
export function phonesRoughlyEqual(a: string, b: string): boolean {
  const da = digitsOnly(a)
  const db = digitsOnly(b)
  if (!da || !db) return false
  if (da === db) return true
  if (da.length >= 8 && db.length >= 8) {
    return da.slice(-9) === db.slice(-9)
  }
  return false
}

export function findGaugeOfficerByPhone(officers: GaugeOfficer[], phone: string): GaugeOfficer | undefined {
  const p = phone.trim()
  if (!p) return undefined
  return officers.find((o) => phonesRoughlyEqual(o.phone, p))
}
