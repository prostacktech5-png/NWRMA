import './env-load.js'

export const PORT = Number(process.env.PORT ?? 4000)

/** Bind address for accepting connections from LAN/mobile (default all interfaces). */
export const HOST = (process.env.HOST ?? '0.0.0.0').trim()

export const NODE_ENV_NON_PRODUCTION =
  process.env.NODE_ENV !== 'production'

export const JWT_SECRET = process.env.JWT_SECRET?.trim() ?? ''

export function requireJwtSecret(): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured')
  }
  return JWT_SECRET
}

/** Comma-separated list of origins, e.g. http://localhost:3000 */
export const ALLOWED_ORIGINS = (process.env.FRONTEND_ORIGINS ??
  'http://localhost:3000,http://127.0.0.1:3000'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
