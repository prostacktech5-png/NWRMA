'use client'

import { WaterDrillingLicenceReadonly } from '@/components/nwrma-site/online-forms/water-drilling-licence-readonly'
import type { BoreholeLicenseApplication } from '@/lib/types'

export function LicenseApplicationReadonlyForm({
  application,
}: {
  application: BoreholeLicenseApplication
}) {
  const isPortalV1 =
    application.formType === 'water-drilling-licence-v1' && application.extendedForm

  if (!isPortalV1) {
    return (
      <p className="text-sm text-muted-foreground">
        Legacy submission {application.reference} — no extended form data on file.
      </p>
    )
  }

  return <WaterDrillingLicenceReadonly application={application} />
}
