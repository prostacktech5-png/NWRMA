import { chiefdomCodeFromName } from '@/lib/borehole-id-generator'
import type { getSql } from '@/lib/db'
import type { DrillingCompany } from '@/lib/types'

type Sql = ReturnType<typeof getSql>

export type AdminResolveInput = {
  regionName: string | null
  districtName: string | null
  chiefdomName: string | null
  settlementType: string | null
}

export type ResolvedAdministrativeIds = {
  regionId: string | null
  districtId: string | null
  chiefdomId: string | null
  settlementTypeId: string | null
  regionLabel: string | null
  districtLabel: string | null
  chiefdomLabel: string | null
  settlementLabel: string | null
  regionCode: string | null
  districtCode: string | null
  chiefdomCode: string | null
  settlementCode: string | null
  errors: string[]
}

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function matchDrillingCompany(
  companies: DrillingCompany[],
  name: string | null
): { id: string; name: string } | null {
  if (!name?.trim()) return null
  const n = norm(name)
  const active = companies.filter((c) => c.status === 'active')
  const exact = active.find((c) => norm(c.name) === n)
  if (exact) return { id: exact.id, name: exact.name }
  const partial = active.find(
    (c) => norm(c.name).includes(n) || n.includes(norm(c.name))
  )
  return partial ? { id: partial.id, name: partial.name } : null
}

export function buildIdPreview(params: {
  regionCode: string | null
  districtCode: string | null
  chiefdomCode: string | null
  settlementCode: string | null
}): string | null {
  const { regionCode, districtCode, chiefdomCode, settlementCode } = params
  if (!regionCode || !districtCode || !chiefdomCode || !settlementCode) return null
  return `${regionCode}/${districtCode}/${chiefdomCode}/${settlementCode}/####`
}

export async function resolveAdministrativeIds(
  sql: Sql,
  input: AdminResolveInput
): Promise<ResolvedAdministrativeIds> {
  const errors: string[] = []
  let regionId: string | null = null
  let districtId: string | null = null
  let chiefdomId: string | null = null
  let settlementTypeId: string | null = null
  let regionLabel: string | null = null
  let districtLabel: string | null = null
  let chiefdomLabel: string | null = null
  let settlementLabel: string | null = null
  let regionCode: string | null = null
  let districtCode: string | null = null
  let chiefdomCode: string | null = null
  let settlementCode: string | null = null

  if (input.regionName?.trim()) {
    const regions = (await sql`
      SELECT id, code, name FROM regions
    `) as { id: string; code: string; name: string }[]
    const r =
      regions.find((x) => norm(x.name) === norm(input.regionName!)) ||
      regions.find((x) => x.code === input.regionName!.trim())
    if (r) {
      regionId = r.id
      regionLabel = r.name
      regionCode = r.code
    } else {
      errors.push(`Region not found: ${input.regionName}`)
    }
  } else {
    errors.push('Region is required for borehole ID.')
  }

  if (input.districtName?.trim() && regionId) {
    const districts = (await sql`
      SELECT id, code, name FROM districts WHERE region_id = ${regionId}
    `) as { id: string; code: string; name: string }[]
    const d =
      districts.find((x) => norm(x.name) === norm(input.districtName!)) ||
      districts.find((x) => x.code === input.districtName!.trim().padStart(2, '0'))
    if (d) {
      districtId = d.id
      districtLabel = d.name
      districtCode = d.code
    } else {
      errors.push(`District not found: ${input.districtName}`)
    }
  } else if (input.districtName?.trim() && !regionId) {
    errors.push('District cannot be resolved without region.')
  } else {
    errors.push('District is required for borehole ID.')
  }

  if (input.chiefdomName?.trim() && districtId) {
    const chiefdoms = (await sql`
      SELECT id, code, name FROM chiefdoms WHERE district_id = ${districtId}
    `) as { id: string; code: string; name: string }[]
    const c =
      chiefdoms.find((x) => norm(x.name) === norm(input.chiefdomName!)) ||
      chiefdoms.find(
        (x) => x.code === chiefdomCodeFromName(input.chiefdomName!)
      )
    if (c) {
      chiefdomId = c.id
      chiefdomLabel = c.name
      chiefdomCode = c.code
    } else {
      errors.push(`Chiefdom not found: ${input.chiefdomName}`)
    }
  } else if (input.chiefdomName?.trim()) {
    errors.push('Chiefdom cannot be resolved without district.')
  } else {
    errors.push('Chiefdom is required for borehole ID.')
  }

  if (input.settlementType?.trim()) {
    const settlements = (await sql`
      SELECT id, code, label FROM settlement_types
    `) as { id: string; code: string; label: string }[]
    const raw = input.settlementType.trim()
    const s =
      settlements.find((x) => x.code.toUpperCase() === raw.toUpperCase()) ||
      settlements.find((x) => norm(x.label) === norm(raw)) ||
      settlements.find((x) => norm(x.label).startsWith(norm(raw)))
    if (s) {
      settlementTypeId = s.id
      settlementLabel = s.label
      settlementCode = s.code
    } else {
      errors.push(`Settlement type not found: ${input.settlementType}`)
    }
  } else {
    errors.push('Settlement type is required for borehole ID.')
  }

  return {
    regionId,
    districtId,
    chiefdomId,
    settlementTypeId,
    regionLabel,
    districtLabel,
    chiefdomLabel,
    settlementLabel,
    regionCode,
    districtCode,
    chiefdomCode,
    settlementCode,
    errors,
  }
}
