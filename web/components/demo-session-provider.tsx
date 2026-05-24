'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  migrateDepartmentSectionAccess,
  normalizeErpDepartmentKey,
} from '@/lib/hydrological-services-merge'
import type { Department, Role, User } from '@/lib/types'
import {
  clearSessionCache,
  readSessionCache,
  userFromSessionCache,
  writeSessionCache,
} from '@/lib/session-cache-client'

export type DemoSessionContextValue = {
  /** `null` when signed out or session invalid — authenticated ERP routes must use `AppAuthGate`. */
  user: User | null
  sessionReady: boolean
  platformRoles: string[]
  canAccessSuperAdmin: boolean
  setSessionUser: (user: User | null) => void
  /** Set user + RBAC meta after login (also writes session cache). */
  setSessionFromLogin: (payload: {
    user: User
    platformRoles: string[]
    canAccessSuperAdmin: boolean
  }) => void
  /** Re-fetch signed-in user from the server (keeps header / menus in sync after profile changes). */
  refreshSession: () => Promise<void>
  actingUserHeaders: HeadersInit
}

const DemoSessionContext = createContext<DemoSessionContextValue | null>(null)

let inflightActingUserFetch: Promise<unknown> | null = null

function fetchActingUserJson(): Promise<unknown> {
  if (!inflightActingUserFetch) {
    inflightActingUserFetch = fetch('/api/session/acting-user', { credentials: 'same-origin' })
      .then(async (res) => {
        if (!res.ok) return { user: null }
        return res.json()
      })
      .finally(() => {
        inflightActingUserFetch = null
      })
  }
  return inflightActingUserFetch
}

function parseSessionUser(body: unknown): User | null {
  if (!body || typeof body !== 'object' || !('user' in body)) return null
  const u = (body as { user?: Record<string, unknown> }).user
  if (!u || typeof u !== 'object') return null
  const id = typeof u.id === 'string' ? u.id.trim() : ''
  const email = typeof u.email === 'string' ? u.email : ''
  const name = typeof u.name === 'string' ? u.name : ''
  const roleRaw = typeof u.role === 'string' ? u.role.trim().toLowerCase() : ''
  const createdAtRaw = typeof u.createdAt === 'string' ? u.createdAt : ''
  if (!id || !['admin', 'dg', 'hod', 'staff'].includes(roleRaw)) return null
  const role = roleRaw as Role
  const department: Department =
    u.department === null || u.department === undefined
      ? null
      : normalizeErpDepartmentKey(String(u.department))
  const createdAt = createdAtRaw ? new Date(createdAtRaw) : new Date()
  if (Number.isNaN(createdAt.getTime())) return null

  let hydroNavAccess: User['hydroNavAccess'] = undefined
  if ('hydroNavAccess' in u) {
    const h = u.hydroNavAccess
    if (h != null && typeof h === 'object' && !Array.isArray(h)) hydroNavAccess = h as NonNullable<User['hydroNavAccess']>
    else hydroNavAccess = null
  }

  let departmentSectionAccess: User['departmentSectionAccess'] = undefined
  if ('departmentSectionAccess' in u) {
    const d = u.departmentSectionAccess
    if (d != null && typeof d === 'object' && !Array.isArray(d)) {
      departmentSectionAccess =
        migrateDepartmentSectionAccess(d as NonNullable<User['departmentSectionAccess']>) ??
        null
    } else {
      departmentSectionAccess = null
    }
  }

  return {
    id,
    email: email.trim().toLowerCase(),
    name,
    role,
    department: role === 'hod' || role === 'staff' ? department : null,
    status: u.status === 'disabled' ? 'disabled' : 'active',
    createdAt,
    ...('hydroNavAccess' in u ? { hydroNavAccess } : {}),
    ...('departmentSectionAccess' in u ? { departmentSectionAccess } : {}),
  }
}

function parseSessionMeta(body: unknown): {
  platformRoles: string[]
  canAccessSuperAdmin: boolean
} {
  if (!body || typeof body !== 'object') {
    return { platformRoles: [], canAccessSuperAdmin: false }
  }
  const b = body as Record<string, unknown>
  const platformRoles = Array.isArray(b.platformRoles)
    ? b.platformRoles.filter((r): r is string => typeof r === 'string')
    : []
  return {
    platformRoles,
    canAccessSuperAdmin: b.canAccessSuperAdmin === true,
  }
}

function persistSessionCache(
  user: User,
  platformRoles: string[],
  canAccessSuperAdmin: boolean,
): void {
  writeSessionCache({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      ...(user.hydroNavAccess !== undefined ? { hydroNavAccess: user.hydroNavAccess } : {}),
      ...(user.departmentSectionAccess !== undefined
        ? { departmentSectionAccess: user.departmentSectionAccess }
        : {}),
    },
    platformRoles,
    canAccessSuperAdmin,
  })
}

export function DemoSessionProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)
  const [platformRoles, setPlatformRoles] = useState<string[]>([])
  const [canAccessSuperAdmin, setCanAccessSuperAdmin] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  const applySessionBody = useCallback((json: unknown) => {
    const next = parseSessionUser(json)
    const meta = parseSessionMeta(json)
    if (next) {
      setUserState(next)
      setPlatformRoles(meta.platformRoles)
      setCanAccessSuperAdmin(meta.canAccessSuperAdmin)
      persistSessionCache(next, meta.platformRoles, meta.canAccessSuperAdmin)
    } else {
      setUserState(null)
      setPlatformRoles([])
      setCanAccessSuperAdmin(false)
      clearSessionCache()
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const cached = readSessionCache()
    if (cached) {
      const cachedUser = userFromSessionCache(cached)
      setUserState(cachedUser)
      setPlatformRoles(cached.platformRoles)
      setCanAccessSuperAdmin(cached.canAccessSuperAdmin)
      setSessionReady(true)
    }

    void (async () => {
      try {
        const json = await fetchActingUserJson()
        if (cancelled) return
        applySessionBody(json)
      } finally {
        if (!cancelled) setSessionReady(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [applySessionBody])

  const setSessionUser = useCallback((next: User | null) => {
    setUserState(next)
    if (!next) {
      clearSessionCache()
    }
  }, [])

  const setSessionFromLogin = useCallback(
    (payload: { user: User; platformRoles: string[]; canAccessSuperAdmin: boolean }) => {
      setUserState(payload.user)
      setPlatformRoles(payload.platformRoles)
      setCanAccessSuperAdmin(payload.canAccessSuperAdmin)
      persistSessionCache(payload.user, payload.platformRoles, payload.canAccessSuperAdmin)
      setSessionReady(true)
    },
    [],
  )

  const refreshSession = useCallback(async () => {
    try {
      const json = await fetchActingUserJson()
      applySessionBody(json)
    } catch {
      /* ignore transient network errors */
    }
  }, [applySessionBody])

  const actingUserHeaders = useMemo((): HeadersInit => {
    const id = user?.id?.trim()
    return id ? { 'X-Acting-User-Id': id } : {}
  }, [user?.id])

  const value = useMemo(
    () => ({
      user,
      sessionReady,
      platformRoles,
      canAccessSuperAdmin,
      setSessionUser,
      setSessionFromLogin,
      refreshSession,
      actingUserHeaders,
    }),
    [
      user,
      sessionReady,
      platformRoles,
      canAccessSuperAdmin,
      setSessionUser,
      setSessionFromLogin,
      refreshSession,
      actingUserHeaders,
    ],
  )

  return (
    <DemoSessionContext.Provider value={value}>{children}</DemoSessionContext.Provider>
  )
}

export function useDemoSession(): DemoSessionContextValue {
  const ctx = useContext(DemoSessionContext)
  if (!ctx) {
    throw new Error('useDemoSession must be used within DemoSessionProvider')
  }
  return ctx
}

/** Use only under `AppAuthGate` (inside authenticated `(app)` layout). */
export function useSessionUser(): { user: User; actingUserHeaders: HeadersInit } {
  const { user, sessionReady, actingUserHeaders } = useDemoSession()
  if (!sessionReady && !user) {
    throw new Error('useSessionUser: session still loading')
  }
  if (!user) {
    throw new Error('useSessionUser: not authenticated')
  }
  return { user, actingUserHeaders }
}
