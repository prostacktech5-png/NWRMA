import type { getSql } from '@/lib/db'

type Sql = ReturnType<typeof getSql>

export function chiefdomCodeFromName(name: string): string {
  const letters = name.replace(/[^a-zA-Z]/g, '').toUpperCase()
  if (letters.length >= 3) return letters.slice(0, 3)
  return letters.padEnd(3, 'X')
}

export type GenerateBoreholeIdInput = {
  regionId: string
  districtId: string
  chiefdomId: string
  settlementTypeId: string
}

export type GeneratedBoreholeId = {
  boreholeId: string
  region: string
  district: string
  chiefdom: string
  settlement_type: string
  regionCode: string
  districtCode: string
  chiefdomCode: string
  settlementCode: string
  serial: number
}

export async function generateBoreholeId(
  sql: Sql,
  input: GenerateBoreholeIdInput
): Promise<GeneratedBoreholeId> {
  const lookup = (await sql`
    SELECT
      r.code AS region_code,
      r.name AS region_name,
      d.code AS district_code,
      d.name AS district_name,
      c.name AS chiefdom_name,
      c.code AS chiefdom_code,
      s.code AS settlement_code,
      s.label AS settlement_label
    FROM regions r
    JOIN districts d ON d.id = ${input.districtId} AND d.region_id = r.id
    JOIN chiefdoms c ON c.id = ${input.chiefdomId} AND c.district_id = d.id
    JOIN settlement_types s ON s.id = ${input.settlementTypeId}
    WHERE r.id = ${input.regionId}
  `) as Record<string, unknown>[]

  const row = lookup[0]
  if (!row) {
    throw new Error('Invalid region, district, chiefdom, or settlement selection.')
  }

  const regionCode = String(row.region_code)
  const districtCode = String(row.district_code)
  const chiefdomCode = String(row.chiefdom_code).toUpperCase()
  const settlementCode = String(row.settlement_code)

  const counterRows = (await sql`
    INSERT INTO borehole_serial_counters (region_code, district_code, chiefdom_code, settlement_code, last_serial)
    VALUES (${regionCode}, ${districtCode}, ${chiefdomCode}, ${settlementCode}, 1)
    ON CONFLICT (region_code, district_code, chiefdom_code, settlement_code)
    DO UPDATE SET last_serial = borehole_serial_counters.last_serial + 1
    RETURNING last_serial
  `) as { last_serial: number }[]

  const serial = Number(counterRows[0]?.last_serial ?? 1)
  const serialPadded = String(serial).padStart(4, '0')
  const boreholeId = `${regionCode}/${districtCode}/${chiefdomCode}/${settlementCode}/${serialPadded}`

  return {
    boreholeId,
    region: String(row.region_name),
    district: String(row.district_name),
    chiefdom: String(row.chiefdom_name),
    settlement_type: String(row.settlement_label),
    regionCode,
    districtCode,
    chiefdomCode,
    settlementCode,
    serial,
  }
}
