/** Sierra Leone bounding box (south-west, north-east). */
export const SIERRA_LEONE_BOUNDS: [[number, number], [number, number]] = [
  [6.86, -13.32],
  [9.95, -10.18],
]

export const SIERRA_LEONE_CENTER: [number, number] = [8.4, -11.75]

export function isInSierraLeone(lat: number, lng: number): boolean {
  const [sw, ne] = SIERRA_LEONE_BOUNDS
  return lat >= sw[0] && lat <= ne[0] && lng >= sw[1] && lng <= ne[1]
}

/** Normalize and validate coordinates for Sierra Leone map pins. */
export function normalizeSierraLeoneCoords(
  lat: number | null | undefined,
  lng: number | null | undefined,
): { lat: number; lng: number } | null {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null

  let la = lat
  let ln = lng

  if (ln > 0 && ln <= 14) ln = -ln
  if (Math.abs(la) <= 14 && Math.abs(ln) > 14 && Math.abs(ln) <= 90) {
    const swap = la
    la = ln
    ln = swap
    if (ln > 0 && ln <= 14) ln = -ln
  }

  if (!isInSierraLeone(la, ln)) return null
  return { lat: la, lng: ln }
}

/** Registry catalogue position first; reading GPS only when registry coords are missing. */
export function resolveStationMapCoords(
  registryLat: number | null,
  registryLng: number | null,
  readingLat: number | null,
  readingLng: number | null,
): { lat: number; lng: number } | null {
  return (
    normalizeSierraLeoneCoords(registryLat, registryLng) ??
    normalizeSierraLeoneCoords(readingLat, readingLng)
  )
}
