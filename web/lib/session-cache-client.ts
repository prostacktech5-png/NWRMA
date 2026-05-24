import type { User } from '@/lib/types'

export const SESSION_CACHE_KEY = 'nwrma_session_cache_v1'
export const SESSION_CACHE_TTL_MS = 30 * 60 * 1000

export type SessionCachePayload = {
  user: {
    id: string
    email: string
    name: string
    role: User['role']
    department: User['department']
    status: User['status']
    createdAt: string
    hydroNavAccess?: User['hydroNavAccess']
    departmentSectionAccess?: User['departmentSectionAccess']
  }
  platformRoles: string[]
  canAccessSuperAdmin: boolean
  cachedAt: number
}

export function readSessionCache(): SessionCachePayload | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SessionCachePayload
    if (!parsed?.user?.id || typeof parsed.cachedAt !== 'number') return null
    if (Date.now() - parsed.cachedAt > SESSION_CACHE_TTL_MS) {
      sessionStorage.removeItem(SESSION_CACHE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function writeSessionCache(payload: Omit<SessionCachePayload, 'cachedAt'>): void {
  if (typeof window === 'undefined') return
  try {
    const entry: SessionCachePayload = { ...payload, cachedAt: Date.now() }
    sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(entry))
  } catch {
    /* quota / private mode */
  }
}

export function clearSessionCache(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(SESSION_CACHE_KEY)
  } catch {
    /* ignore */
  }
}

export function userFromSessionCache(cached: SessionCachePayload): User {
  return {
    ...cached.user,
    createdAt: new Date(cached.user.createdAt),
  }
}
