'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RegistryReviewActions } from '@/components/boreholes/registry-review-actions'
import type { Survey123BoreholeIntake } from '@/lib/types'

export function BoreholeRegistryReviewSidebar({
  intake,
  onUpdated,
}: {
  intake: Survey123BoreholeIntake
  onUpdated: (app: Survey123BoreholeIntake) => void
}) {
  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="text-lg">Registry decision</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          Review the Survey123 data on the left. Approve to generate the national borehole ID, or
          reject without assigning an ID.
        </p>
        <RegistryReviewActions intake={intake} onUpdated={onUpdated} layout="sidebar" />
      </CardContent>
    </Card>
  )
}
