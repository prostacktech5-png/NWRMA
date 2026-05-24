import {
  getSql,
  isPostgresConnectionPoolError,
  isPostgresTransientConnectionError,
} from '@/lib/db'
import { createDefaultErpReferencePayload } from '@/lib/erp-reference-defaults'
import type { ErpReferencePayload } from '@/lib/erp-reference-types'
import { syncApprovedApplicationsToRegistry } from '@/lib/borehole-license-application'
import {
  mergeReferencePayloadWithDefaults,
  payloadToStorableJson,
} from '@/lib/erp-reference-serialize'

function parsePayloadColumn(raw: unknown): Partial<ErpReferencePayload> | null {
  if (raw == null) return null
  if (typeof raw === 'object') return raw as Partial<ErpReferencePayload>
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Partial<ErpReferencePayload>
    } catch {
      return null
    }
  }
  return null
}

/** In-memory snapshot TTL — cuts repeated ~1s Postgres reads during navigation and polling. */
const REFERENCE_PAYLOAD_TTL_MS = 25_000

let referencePayloadCache: { payload: ErpReferencePayload; at: number } | null = null
let referencePayloadPromise: Promise<ErpReferencePayload> | null = null

export function invalidateErpReferencePayloadCache(): void {
  referencePayloadCache = null
  referencePayloadPromise = null
}

export type LoadErpReferenceOptions = {
  /** When false, skips in-memory license→registry sync (faster read-only paths). Default true. */
  syncRegistry?: boolean
  /** Bypass in-memory cache and read the latest row from Postgres (use before writes / live desks). */
  fresh?: boolean
}

export type MutateErpReferenceOptions = {
  syncRegistry?: boolean
  maxAttempts?: number
}

async function loadOrSeedErpReferencePayloadUncached(
  syncRegistry: boolean,
): Promise<ErpReferencePayload> {
  const defaults = createDefaultErpReferencePayload()
  const sql = getSql()

  const rows = (await sql`
    SELECT payload FROM erp_reference_snapshot WHERE id = 'global'
  `) as { payload: unknown }[]

  const row = rows[0]
  if (row) {
    const partial = parsePayloadColumn(row.payload)
    const merged = mergeReferencePayloadWithDefaults(partial, defaults)
    return syncRegistry ? syncApprovedApplicationsToRegistry(merged) : merged
  }

  const initial: ErpReferencePayload = syncRegistry
    ? syncApprovedApplicationsToRegistry({ ...defaults })
    : { ...defaults }
  const storable = payloadToStorableJson(initial)
  await sql`
    INSERT INTO erp_reference_snapshot (id, payload, updated_at)
    VALUES ('global', ${JSON.stringify(storable)}, NOW())
    ON CONFLICT (id) DO UPDATE SET
      payload = EXCLUDED.payload,
      updated_at = EXCLUDED.updated_at
  `
  return initial
}

/**
 * Loads merged ERP reference data from Supabase. Seeds defaults on first run.
 */
function readCachedPayload(syncRegistry: boolean): ErpReferencePayload | null {
  const now = Date.now()
  if (
    !referencePayloadCache ||
    now - referencePayloadCache.at >= REFERENCE_PAYLOAD_TTL_MS
  ) {
    return null
  }
  const cached = referencePayloadCache.payload
  return syncRegistry ? syncApprovedApplicationsToRegistry(cached) : cached
}

export async function loadOrSeedErpReferencePayload(
  options?: LoadErpReferenceOptions,
): Promise<ErpReferencePayload> {
  const syncRegistry = options?.syncRegistry !== false
  if (options?.fresh) {
    invalidateErpReferencePayloadCache()
    const payload = await loadOrSeedErpReferencePayloadUncached(syncRegistry)
    referencePayloadCache = { payload, at: Date.now() }
    return payload
  }

  const cached = readCachedPayload(syncRegistry)
  if (cached) return cached

  if (!referencePayloadPromise) {
    referencePayloadPromise = loadOrSeedErpReferencePayloadUncached(syncRegistry)
      .then((payload) => {
        referencePayloadCache = { payload, at: Date.now() }
        referencePayloadPromise = null
        return payload
      })
      .catch((err) => {
        referencePayloadPromise = null
        throw err
      })
  }
  return referencePayloadPromise
}

export async function saveErpReferencePayload(payload: ErpReferencePayload): Promise<void> {
  const sql = getSql()
  const storable = payloadToStorableJson(payload)
  await sql`
    INSERT INTO erp_reference_snapshot (id, payload, updated_at)
    VALUES ('global', ${JSON.stringify(storable)}, NOW())
    ON CONFLICT (id) DO UPDATE SET
      payload = EXCLUDED.payload,
      updated_at = EXCLUDED.updated_at
  `
  invalidateErpReferencePayloadCache()
}

/**
 * Read-modify-write ERP snapshot with a fresh load (retries on transient DB errors).
 */
export async function mutateErpReferencePayload(
  mutate: (payload: ErpReferencePayload) => ErpReferencePayload,
  options?: MutateErpReferenceOptions,
): Promise<ErpReferencePayload> {
  const syncRegistry = options?.syncRegistry === true
  const maxAttempts = options?.maxAttempts ?? 3
  let lastError: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      invalidateErpReferencePayloadCache()
      const payload = await loadOrSeedErpReferencePayloadUncached(syncRegistry)
      const next = mutate(payload)
      await saveErpReferencePayload(next)
      return next
    } catch (e) {
      lastError = e
      const retryable =
        isPostgresConnectionPoolError(e) || isPostgresTransientConnectionError(e)
      if (!retryable || attempt === maxAttempts - 1) throw e
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)))
    }
  }
  throw lastError
}

/** Full reset used by `seedDatabaseFull`. */
export async function replaceErpReferencePayloadWithDefaults(): Promise<void> {
  const defaults = createDefaultErpReferencePayload()
  await saveErpReferencePayload(defaults)
}
