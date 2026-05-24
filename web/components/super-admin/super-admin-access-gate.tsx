'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useDemoSession } from '@/components/demo-session-provider'

export function SuperAdminAccessGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { sessionReady, canAccessSuperAdmin } = useDemoSession()

  useEffect(() => {
    if (!sessionReady) return
    if (!canAccessSuperAdmin) {
      router.replace('/dashboard')
    }
  }, [sessionReady, canAccessSuperAdmin, router])

  if (canAccessSuperAdmin) {
    return <>{children}</>
  }

  if (!sessionReady) {
    return (
      <div className="flex min-h-[12rem] items-center justify-center rounded-lg border border-dashed bg-muted/20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex min-h-[12rem] items-center justify-center text-sm text-muted-foreground">
      Redirecting…
    </div>
  )
}
