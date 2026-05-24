export type WaterLevelBand = 'low' | 'medium' | 'high'

/** 0–3 m → Low; 3–6 m → Medium; ≥6 m → High (3 m counted as Medium, 6 m as High). */
export function waterLevelBand(levelMeters: number): WaterLevelBand {
  if (!Number.isFinite(levelMeters)) return 'low'
  if (levelMeters < 3) return 'low'
  if (levelMeters < 6) return 'medium'
  return 'high'
}
