import type { ErpReferencePayload } from '@/lib/erp-reference-types'

const REQUIRED_KEYS = [
  'fiscalYears',
  'programmeBudgetLines',
  'requisitions',
  'requisitionEvents',
  'monitoringStations',
  'floodIncidents',
  'drillingCompanies',
  'boreholes',
  'licenseApplications',
  'damSafetyApplications',
  'effluentDischargeApplications',
  'waterRightApplications',
  'onlineFormPaymentIntakes',
  'labRequests',
  'employees',
  'notifications',
  'waterLevelReadings',
] as const satisfies readonly (keyof ErpReferencePayload)[]

/** Revive ISO-like date strings after JSON.parse (client or DB driver). */
export function reviveIsoDatesDeep(value: unknown): unknown {
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(value) && value.length >= 10) {
      const d = new Date(value)
      if (!Number.isNaN(d.getTime())) return d
    }
    return value
  }
  if (Array.isArray(value)) return value.map(reviveIsoDatesDeep)
  if (value !== null && typeof value === 'object') {
    const o = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(o)) {
      out[k] = reviveIsoDatesDeep(v)
    }
    return out
  }
  return value
}

export function mergeReferencePayloadWithDefaults(
  raw: Partial<ErpReferencePayload> | null | undefined,
  defaults: ErpReferencePayload
): ErpReferencePayload {
  const out: Record<string, unknown> = { ...defaults }
  if (!raw || typeof raw !== 'object') return reviveIsoDatesDeep(out) as ErpReferencePayload
  for (const key of REQUIRED_KEYS) {
    const slice = raw[key]
    out[key] = Array.isArray(slice) ? slice : defaults[key]
  }
  return reviveIsoDatesDeep(out) as ErpReferencePayload
}

export function payloadToStorableJson(payload: ErpReferencePayload): Record<string, unknown> {
  return JSON.parse(JSON.stringify(payload)) as Record<string, unknown>
}
