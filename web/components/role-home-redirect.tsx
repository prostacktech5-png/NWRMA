'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useDemoSession } from '@/components/demo-session-provider'

/** Sends Director General users from generic dashboard to their executive workspace. */
export function RoleHomeRedirect() {
  const { user, sessionReady } = useDemoSession()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!sessionReady || !user) return
    if (user.role !== 'dg') return
    if (pathname !== '/dashboard') return
    router.replace('/dg')
  }, [sessionReady, user, pathname, router])

  return null
}
