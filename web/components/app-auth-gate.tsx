'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useDemoSession } from '@/components/demo-session-provider'

/**
 * Requires a valid session cookie + `User` row. Unauthenticated users go to `/login`.
 * Keeps demo/mock users out of the ERP shell so departments only see live data.
 */
export function AppAuthGate({ children }: { children: React.ReactNode }) {
  const { user, sessionReady } = useDemoSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!sessionReady) return
    if (user) return
    const loc =
      typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}`
        : pathname ?? '/dashboard'
    const q =
      loc && loc !== '/' && loc !== '/login' && !loc.startsWith('/login?')
        ? `?next=${encodeURIComponent(loc)}`
        : ''
    router.replace(`/login${q}`)
  }, [sessionReady, user, pathname, router])

  if (user) {
    return children
  }

  if (sessionReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        <p className="text-sm">Redirecting to sign in…</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-2 bg-background text-muted-foreground">
      <div className="size-8 animate-pulse rounded-full bg-primary/30" aria-hidden />
      <p className="text-sm">Loading session…</p>
    </div>
  )
}
