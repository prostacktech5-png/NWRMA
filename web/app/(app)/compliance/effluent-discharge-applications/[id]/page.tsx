'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useErpReference } from '@/components/reference-data-provider'
import { EffluentDischargeReadonlyForm } from '@/components/effluent-discharge/effluent-discharge-readonly-form'
import { EffluentDischargeReviewSidebar } from '@/components/effluent-discharge/effluent-discharge-review-sidebar'
import type { EffluentDischargeApplication } from '@/lib/types'

export default function EffluentDischargeApplicationReviewPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : ''
  const { data } = useErpReference()

  const initial = useMemo(
    () => (data.effluentDischargeApplications ?? []).find((a) => a.id === id),
    [data.effluentDischargeApplications, id]
  )

  const [application, setApplication] = useState<EffluentDischargeApplication | undefined>(
    initial
  )

  useEffect(() => {
    if (initial) setApplication(initial)
  }, [initial])

  const current = application ?? initial

  if (!current) {
    return (
      <div className="space-y-6">
        <Link
          href="/compliance/effluent-discharge-applications"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to applications
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium text-foreground">Application not found</p>
            <p className="mt-2 text-sm text-muted-foreground">
              This submission may have been removed or the link is incorrect.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/compliance/effluent-discharge-applications">View all applications</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        href="/compliance/effluent-discharge-applications"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to applications
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EffluentDischargeReadonlyForm application={current} />
        </div>
        <div>
          <EffluentDischargeReviewSidebar application={current} onUpdated={setApplication} />
        </div>
      </div>
    </div>
  )
}
