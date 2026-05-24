import type { Survey123BoreholeIntakeFields } from '@/lib/types'

/** Map ArcGIS Survey123 / generic JSON keys to normalized intake fields. */
const FIELD_ALIASES: Record<keyof Survey123BoreholeIntakeFields, string[]> = {
  drillingCompanyName: [
    'drilling_company_name',
    'drillingCompanyName',
    'company',
    'company_name',
    'Company',
  ],
  locationDescription: [
    'location_description',
    'locationDescription',
    'location',
    'borehole_location',
    'BoreholeLocation',
  ],
  lat: ['lat', 'latitude', 'y', 'Latitude'],
  lng: ['lng', 'lon', 'longitude', 'x', 'Longitude'],
  drillingMethod: ['drilling_method', 'drillingMethod', 'DrillingMethod'],
  boreholeDepthM: ['borehole_depth_m', 'boreholeDepthM', 'depth', 'borehole_depth', 'BoreholeDepth'],
  overburdenDepthM: [
    'overburden_depth_m',
    'overburdenDepthM',
    'depth_of_overburden',
    'overburden_depth',
  ],
  waterStrikeDepthsM: [
    'water_strike_depths_m',
    'waterStrikeDepthsM',
    'depth_to_water_strikes',
    'water_strikes',
  ],
  permanentCasingType: [
    'permanent_casing_type',
    'permanentCasingType',
    'casing_type',
    'TypeOfPermanentCasing',
  ],
  yieldLps: ['yield_lps', 'yieldLps', 'yield', 'Yield'],
  transmissivity: ['transmissivity', 'Transmissivity'],
  hydraulicConductivity: [
    'hydraulic_conductivity',
    'hydraulicConductivity',
    'HydraulicConductivity',
  ],
  waterQualityPhysical: [
    'water_quality_physical',
    'waterQualityPhysical',
    'physical_water_quality',
    'water_quality',
  ],
  regionName: ['region', 'region_name', 'regionName', 'Region'],
  districtName: ['district', 'district_name', 'districtName', 'District'],
  chiefdomName: ['chiefdom', 'chiefdom_name', 'chiefdomName', 'Chiefdom'],
  settlementType: [
    'settlement_type',
    'settlementType',
    'settlement',
    'SettlementType',
    'Settlement',
  ],
}

function pickString(raw: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = raw[k]
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return null
}

function pickNumber(raw: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = raw[k]
    if (v == null || v === '') continue
    const n = typeof v === 'number' ? v : Number(String(v))
    if (Number.isFinite(n)) return n
  }
  return null
}

function pickWaterStrikes(raw: Record<string, unknown>, keys: string[]): number[] | null {
  for (const k of keys) {
    const v = raw[k]
    if (v == null) continue
    if (Array.isArray(v)) {
      const nums = v.map((x) => Number(x)).filter((n) => Number.isFinite(n))
      return nums.length ? nums : null
    }
    if (typeof v === 'string') {
      const nums = v
        .split(/[,;]+/)
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n))
      return nums.length ? nums : null
    }
  }
  return null
}

function pickQuality(raw: Record<string, unknown>, keys: string[]): Record<string, unknown> | null {
  for (const k of keys) {
    const v = raw[k]
    if (v != null && typeof v === 'object' && !Array.isArray(v)) {
      return v as Record<string, unknown>
    }
  }
  return null
}

export function mapSurvey123Payload(
  raw: Record<string, unknown>
): Survey123BoreholeIntakeFields {
  return {
    drillingCompanyName: pickString(raw, FIELD_ALIASES.drillingCompanyName),
    locationDescription: pickString(raw, FIELD_ALIASES.locationDescription),
    lat: pickNumber(raw, FIELD_ALIASES.lat),
    lng: pickNumber(raw, FIELD_ALIASES.lng),
    drillingMethod: pickString(raw, FIELD_ALIASES.drillingMethod),
    boreholeDepthM: pickNumber(raw, FIELD_ALIASES.boreholeDepthM),
    overburdenDepthM: pickNumber(raw, FIELD_ALIASES.overburdenDepthM),
    waterStrikeDepthsM: pickWaterStrikes(raw, FIELD_ALIASES.waterStrikeDepthsM),
    permanentCasingType: pickString(raw, FIELD_ALIASES.permanentCasingType),
    yieldLps: pickNumber(raw, FIELD_ALIASES.yieldLps),
    transmissivity: pickNumber(raw, FIELD_ALIASES.transmissivity),
    hydraulicConductivity: pickNumber(raw, FIELD_ALIASES.hydraulicConductivity),
    waterQualityPhysical: pickQuality(raw, FIELD_ALIASES.waterQualityPhysical),
    regionName: pickString(raw, FIELD_ALIASES.regionName),
    districtName: pickString(raw, FIELD_ALIASES.districtName),
    chiefdomName: pickString(raw, FIELD_ALIASES.chiefdomName),
    settlementType: pickString(raw, FIELD_ALIASES.settlementType),
  }
}
