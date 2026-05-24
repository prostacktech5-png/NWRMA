'use client'

import { ShieldAlert } from 'lucide-react'
import { HydrologicalSettingsPage } from '@/components/hydro/hydro-settings-page'
import { useSessionUser } from '@/components/demo-session-provider'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { canManageHydrologicalSettings } from '@/lib/hydro-settings-policy'

/** Hydrological department workspace entry — same behaviour as Settings → Hydrological. */
export default function HydrologicalDepartmentGeneralSettingsPage() {
  const { user } = useSessionUser()

  if (!canManageHydrologicalSettings(user)) {
    return (
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Access restricted</AlertTitle>
        <AlertDescription>
          General settings are available only to the Hydrological Head of Department or an administrator.
        </AlertDescription>
      </Alert>
    )
  }

  return <HydrologicalSettingsPage />
}
