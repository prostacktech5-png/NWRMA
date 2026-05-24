import postgres from 'postgres'

/**
 * Tagged-template Postgres client (postgres.js).
 * Use `DATABASE_URL` from Supabase: Dashboard → Project Settings → Database → Connection string → URI.
 * Prefer **Session pooler** (port 5432) or direct connection for prepared statements; **Transaction pooler**
 * (port 6543 / `pooler.supabase.com`) disables prepared statements automatically below.
 */
let sqlSingleton: ReturnType<typeof postgres> | null = null

function usesSupabaseTransactionPooler(url: string): boolean {
  return (
    url.includes('pooler.supabase.com') ||
    /[:@][^/:]*:6543(\/|[?]|$)/.test(url)
  )
}

export function getSql(): ReturnType<typeof postgres> {
  if (typeof window !== 'undefined') {
    throw new Error('Database client must only be used on the server.')
  }
  const url = process.env.DATABASE_URL?.trim()
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Add your Supabase Postgres URI to web/.env.local (Supabase Dashboard → Project Settings → Database → URI).'
    )
  }
  if (!sqlSingleton) {
    const transactionPooler = usesSupabaseTransactionPooler(url)
    const defaultPoolMax =
      process.env.NODE_ENV === 'development' && !process.env.DATABASE_POOL_MAX ? '3' : '5'
    sqlSingleton = postgres(url, {
      max: Number(process.env.DATABASE_POOL_MAX ?? defaultPoolMax),
      idle_timeout: 20,
      connect_timeout: 20,
      ...(transactionPooler ? { prepare: false } : {}),
    })
  }
  return sqlSingleton
}

/** Postgres undefined_table / undefined_object (some drivers omit `code`; fall back on message). */
export function isPostgresUndefinedRelationError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false
  const { code, message } = e as { code?: string; message?: string }
  if (code === '42P01' || code === '42P02') return true
  const msg = typeof message === 'string' ? message.toLowerCase() : ''
  return (
    msg.includes('does not exist') &&
    (msg.includes('relation') || msg.includes('table'))
  )
}

/** Session pooler exhausted (Supabase EMAXCONNSESSION / max clients reached). */
export function isPostgresConnectionPoolError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false
  const { code, message } = e as { code?: string; message?: string }
  const msg = typeof message === 'string' ? message.toLowerCase() : ''
  return (
    code === 'XX000' ||
    msg.includes('emaxconnsession') ||
    msg.includes('max clients reached') ||
    (msg.includes('max clients') && msg.includes('pool'))
  )
}

/** DNS, timeout, or dropped connection to Postgres (Supabase pooler / network). */
export function isPostgresTransientConnectionError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false
  const { code, errno, syscall, message } = e as {
    code?: string
    errno?: number
    syscall?: string
    message?: string
  }
  const transientCodes = new Set([
    'ENOTFOUND',
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'EPIPE',
    'EHOSTUNREACH',
    'ENETUNREACH',
  ])
  if (code && transientCodes.has(code)) return true
  if (errno === -3008 || errno === -4077) return true
  if (syscall === 'getaddrinfo' || syscall === 'connect' || syscall === 'read') {
    return true
  }
  const msg = typeof message === 'string' ? message.toLowerCase() : ''
  return (
    msg.includes('connection terminated') ||
    msg.includes('connection reset') ||
    msg.includes('timeout') ||
    msg.includes('pooler.supabase.com')
  )
}

/** Missing column (e.g. before `hydroNavAccess` migration). Code 42703 = undefined_column. */
export function isPostgresUndefinedColumnError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false
  const { code, message } = e as { code?: string; message?: string }
  if (code === '42703') return true
  const msg = typeof message === 'string' ? message.toLowerCase() : ''
  return msg.includes('column') && msg.includes('does not exist')
}

/** Wrap Route Handlers that hit Postgres — maps missing schema / config to JSON 503 responses. */
export async function tryRespondWithDbSetupHint(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn()
  } catch (e) {
    if (isPostgresUndefinedRelationError(e)) {
      return Response.json(
        {
          error: 'Database is not set up for this app.',
          hint:
            'Apply Prisma migrations to your Supabase database (creates hydro_portal_links, gauge_officers, etc.): cd server && npx prisma migrate deploy — use the same DATABASE_URL as web/.env.local. Optionally POST /api/admin/seed-database with x-seed-secret for demo rows only.',
          code: 'DB_SCHEMA_MISSING',
        },
        { status: 503 },
      )
    }
    if (isPostgresConnectionPoolError(e)) {
      return Response.json(
        {
          error: 'Database temporarily unavailable. Wait a moment and try again.',
          code: 'DB_POOL_EXHAUSTED',
        },
        { status: 503 },
      )
    }
    if (isPostgresTransientConnectionError(e)) {
      const detail = e instanceof Error ? e.message : 'Connection failed'
      return Response.json(
        {
          error: 'Cannot reach the database. Check your internet connection and DATABASE_URL.',
          hint:
            'If using Supabase, confirm the pooler host in web/.env.local resolves (Session pooler on port 5432). Retry in a few seconds.',
          code: 'DB_CONNECTION_FAILED',
          detail,
        },
        { status: 503 },
      )
    }
    if (e instanceof Error && e.message.includes('DATABASE_URL is not set')) {
      return Response.json(
        {
          error: 'Database is not configured.',
          hint:
            'Add DATABASE_URL to web/.env.local with your Supabase Postgres connection string (Project Settings → Database → URI).',
          code: 'DATABASE_URL_MISSING',
        },
        { status: 503 },
      )
    }
    throw e
  }
}

/** Returns true if the database accepts a trivial query. */
export async function pingDatabase(): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const sql = getSql()
    const rows = await sql`SELECT 1 AS ok`
    const row = rows[0] as { ok?: unknown } | undefined
    const n = Number(row?.ok)
    if (n !== 1) {
      return { ok: false, message: 'Unexpected response from database.' }
    }
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Database connection failed.'
    return { ok: false, message }
  }
}
