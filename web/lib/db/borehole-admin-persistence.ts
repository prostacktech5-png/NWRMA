import { chiefdomCodeFromName } from '@/lib/borehole-id-generator'
import { getSql, isPostgresUndefinedRelationError } from '@/lib/db'
import {
  CHIEFDOMS,
  DISTRICTS,
  REGIONS,
  SETTLEMENT_TYPES,
} from '@/lib/db/sl-administrative-seed'

let adminSeedPromise: Promise<void> | null = null

async function seedAdministrativeDataIfNeeded(): Promise<void> {
  const sql = getSql()
  try {
    const existing = await sql`SELECT 1 FROM regions LIMIT 1`
    if ((existing as unknown[]).length > 0) return
  } catch (e) {
    if (!isPostgresUndefinedRelationError(e)) throw e
  }
  await seedAdministrativeData()
}

export async function ensureAdministrativeData(): Promise<void> {
  if (!adminSeedPromise) {
    adminSeedPromise = seedAdministrativeDataIfNeeded().catch((err) => {
      adminSeedPromise = null
      throw err
    })
  }
  return adminSeedPromise
}

export async function seedAdministrativeData(): Promise<void> {
  const sql = getSql()

  for (const r of REGIONS) {
    await sql`
      INSERT INTO regions (id, code, name)
      VALUES (${r.id}, ${r.code}, ${r.name})
      ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, name = EXCLUDED.name
    `
  }

  for (const d of DISTRICTS) {
    await sql`
      INSERT INTO districts (id, region_id, code, name)
      VALUES (${d.id}, ${d.regionId}, ${d.code}, ${d.name})
      ON CONFLICT (id) DO UPDATE SET
        region_id = EXCLUDED.region_id,
        code = EXCLUDED.code,
        name = EXCLUDED.name
    `
  }

  for (const s of SETTLEMENT_TYPES) {
    await sql`
      INSERT INTO settlement_types (id, code, label)
      VALUES (${s.id}, ${s.code}, ${s.label})
      ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, label = EXCLUDED.label
    `
  }

  for (const c of CHIEFDOMS) {
    const code = chiefdomCodeFromName(c.name)
    await sql`
      INSERT INTO chiefdoms (id, district_id, name, code)
      VALUES (${c.id}, ${c.districtId}, ${c.name}, ${code})
      ON CONFLICT (id) DO UPDATE SET
        district_id = EXCLUDED.district_id,
        name = EXCLUDED.name,
        code = EXCLUDED.code
    `
  }
}

export type AdministrativeRegion = {
  id: string
  code: string
  name: string
  districts: {
    id: string
    code: string
    name: string
    chiefdoms: { id: string; name: string; code: string }[]
  }[]
}

export type AdministrativePayload = {
  regions: AdministrativeRegion[]
  settlementTypes: { id: string; code: string; label: string }[]
}

export async function loadAdministrativeHierarchy(): Promise<AdministrativePayload> {
  await ensureAdministrativeData()
  const sql = getSql()

  const regions = (await sql`
    SELECT id, code, name FROM regions ORDER BY code
  `) as { id: string; code: string; name: string }[]

  const districts = (await sql`
    SELECT id, region_id, code, name FROM districts ORDER BY code
  `) as { id: string; region_id: string; code: string; name: string }[]

  const chiefdoms = (await sql`
    SELECT id, district_id, name, code FROM chiefdoms ORDER BY name
  `) as { id: string; district_id: string; name: string; code: string }[]

  const settlementTypes = (await sql`
    SELECT id, code, label FROM settlement_types ORDER BY code
  `) as { id: string; code: string; label: string }[]

  return {
    regions: regions.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      districts: districts
        .filter((d) => d.region_id === r.id)
        .map((d) => ({
          id: d.id,
          code: d.code,
          name: d.name,
          chiefdoms: chiefdoms
            .filter((c) => c.district_id === d.id)
            .map((c) => ({ id: c.id, name: c.name, code: c.code })),
        })),
    })),
    settlementTypes: settlementTypes.map((s) => ({
      id: s.id,
      code: s.code,
      label: s.label,
    })),
  }
}

export function isBoreholeSchemaMissingError(err: unknown): boolean {
  return isPostgresUndefinedRelationError(err)
}
