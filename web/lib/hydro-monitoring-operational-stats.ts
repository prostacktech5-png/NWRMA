/**
 * Operational flood level: short-window aggregate over recent HoD-valid readings
 * (see fillStationMonitoringSnapshotsFromRollup).
 */

export const OPERATIONAL_READING_WINDOW_MAX = 5

/** Median of a numeric list (mutates a copy for sorting). */
export function medianLevels(levels: number[]): number | null {
  if (!levels.length) return null
  const s = [...levels].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2
}

/**
 * Last up to `OPERATIONAL_READING_WINDOW_MAX` chronologically ordered readings
 * (caller must have sorted oldest → newest).
 */
export function sliceLastForOperational<T>(chronological: T[]): T[] {
  const n = Math.min(OPERATIONAL_READING_WINDOW_MAX, chronological.length)
  return chronological.slice(-n)
}

const MS_PER_DAY = 86_400_000

/**
 * Simple linear regression slope dy/dt where t is days since the first point
 * in the slice. Returns m/day, or null if fewer than 2 finite points or degenerate time.
 */
export function regressionSlopeMPerDay(
  points: { tMs: number; y: number }[]
): number | null {
  if (points.length < 2) return null
  const t0 = points[0]!.tMs
  const data = points.map((p) => ({
    t: (p.tMs - t0) / MS_PER_DAY,
    y: p.y,
  }))
  const n = data.length
  let sumT = 0
  let sumY = 0
  let sumTT = 0
  let sumTY = 0
  for (const p of data) {
    if (!Number.isFinite(p.t) || !Number.isFinite(p.y)) return null
    sumT += p.t
    sumY += p.y
    sumTT += p.t * p.t
    sumTY += p.t * p.y
  }
  const denom = n * sumTT - sumT * sumT
  if (Math.abs(denom) < 1e-18) return null
  const slope = (n * sumTY - sumT * sumY) / denom
  return Number.isFinite(slope) ? slope : null
}
