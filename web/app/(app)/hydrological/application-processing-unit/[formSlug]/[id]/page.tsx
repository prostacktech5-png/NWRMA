'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ApuReviewHeader } from '@/components/hydrological/apu-review-header'
import { useErpReference } from '@/components/reference-data-provider'
import { DamSafetyReadonlyForm } from '@/components/dam-safety/dam-safety-readonly-form'
import { DamSafetyReviewSidebar } from '@/components/dam-safety/dam-safety-review-sidebar'
import { EffluentDischargeReadonlyForm } from '@/components/effluent-discharge/effluent-discharge-readonly-form'
import { EffluentDischargeReviewSidebar } from '@/components/effluent-discharge/effluent-discharge-review-sidebar'
import { WaterRightReadonlyForm } from '@/components/water-right/water-right-readonly-form'
import { WaterRightReviewSidebar } from '@/components/water-right/water-right-review-sidebar'
import { LicenseApplicationReadonlyForm } from '@/components/borehole-licensing/license-application-readonly-form'
import { LicenseApplicationReviewSidebar } from '@/components/borehole-licensing/license-application-review-sidebar'
import {
  findLinkedPaymentIntake,
  HYDROLOGICAL_APU_LIST_PATH,
  isOnlineFormSlug,
  type OnlineFormSlug,
} from '@/lib/hydrological-application-processing'
import type {
  BoreholeLicenseApplication,
  DamSafetyApplication,
  EffluentDischargeApplication,
  WaterRightApplication,
} from '@/lib/types'

export default function ApplicationProcessingUnitReviewPage() {
  const params = useParams()
  const formSlugRaw = typeof params.formSlug === 'string' ? params.formSlug : ''
  const id = typeof params.id === 'string' ? params.id : ''
  const formSlug: OnlineFormSlug | null = isOnlineFormSlug(formSlugRaw) ? formSlugRaw : null
  const { data } = useErpReference()

  const damInitial = useMemo(
    () =>
      formSlug === 'dam-safety'
        ? (data.damSafetyApplications ?? []).find((a) => a.id === id)
        : undefined,
    [data.damSafetyApplications, formSlug, id]
  )
  const effluentInitial = useMemo(
    () =>
      formSlug === 'effluent-discharge'
        ? (data.effluentDischargeApplications ?? []).find((a) => a.id === id)
        : undefined,
    [data.effluentDischargeApplications, formSlug, id]
  )
  const waterRightInitial = useMemo(
    () =>
      formSlug === 'water-right'
        ? (data.waterRightApplications ?? []).find((a) => a.id === id)
        : undefined,
    [data.waterRightApplications, formSlug, id]
  )
  const licenseInitial = useMemo(
    () =>
      formSlug === 'water-drilling-licence'
        ? data.licenseApplications.find((a) => a.id === id)
        : undefined,
    [data.licenseApplications, formSlug, id]
  )

  const [damApp, setDamApp] = useState<DamSafetyApplication | undefined>(damInitial)
  const [effluentApp, setEffluentApp] = useState<EffluentDischargeApplication | undefined>(
    effluentInitial
  )
  const [waterRightApp, setWaterRightApp] = useState<WaterRightApplication | undefined>(
    waterRightInitial
  )
  const [licenseApp, setLicenseApp] = useState<BoreholeLicenseApplication | undefined>(
    licenseInitial
  )

  useEffect(() => {
    if (damInitial) setDamApp(damInitial)
  }, [damInitial])
  useEffect(() => {
    if (effluentInitial) setEffluentApp(effluentInitial)
  }, [effluentInitial])
  useEffect(() => {
    if (waterRightInitial) setWaterRightApp(waterRightInitial)
  }, [waterRightInitial])
  useEffect(() => {
    if (licenseInitial) setLicenseApp(licenseInitial)
  }, [licenseInitial])

  const linkedIntake = useMemo(() => {
    if (!formSlug || !id) return undefined
    return findLinkedPaymentIntake(data, formSlug, id)
  }, [data, formSlug, id])

  function reviewHeader(
    reference: string,
    organisationName?: string
  ) {
    if (!formSlug) return null
    return (
      <ApuReviewHeader
        formSlug={formSlug}
        reference={reference}
        intakeReference={linkedIntake?.intakeReference}
        organisationName={organisationName}
      />
    )
  }

  const backLink = (
    <Link
      href={HYDROLOGICAL_APU_LIST_PATH}
      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Application processing unit
    </Link>
  )

  if (!formSlug) {
    return (
      <div className="space-y-6">
        {backLink}
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Unknown form type.
          </CardContent>
        </Card>
      </div>
    )
  }

  const dam = damApp ?? damInitial
  if (formSlug === 'dam-safety' && dam) {
    return (
      <div className="space-y-6">
        {backLink}
        {reviewHeader(dam.reference, dam.organisationName)}
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <DamSafetyReadonlyForm application={dam} />
          </div>
          <div>
            <DamSafetyReviewSidebar application={dam} onUpdated={setDamApp} />
          </div>
        </div>
      </div>
    )
  }

  const effluent = effluentApp ?? effluentInitial
  if (formSlug === 'effluent-discharge' && effluent) {
    return (
      <div className="space-y-6">
        {backLink}
        {reviewHeader(effluent.reference, effluent.organisationName)}
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <EffluentDischargeReadonlyForm application={effluent} />
          </div>
          <div>
            <EffluentDischargeReviewSidebar application={effluent} onUpdated={setEffluentApp} />
          </div>
        </div>
      </div>
    )
  }

  const waterRight = waterRightApp ?? waterRightInitial
  if (formSlug === 'water-right' && waterRight) {
    return (
      <div className="space-y-6">
        {backLink}
        {reviewHeader(waterRight.reference, waterRight.organisationName)}
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <WaterRightReadonlyForm application={waterRight} />
          </div>
          <div>
            <WaterRightReviewSidebar application={waterRight} onUpdated={setWaterRightApp} />
          </div>
        </div>
      </div>
    )
  }

  const license = licenseApp ?? licenseInitial
  if (formSlug === 'water-drilling-licence' && license) {
    return (
      <div className="space-y-6">
        {backLink}
        {reviewHeader(license.reference, license.organisationName)}
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <LicenseApplicationReadonlyForm application={license} />
          </div>
          <div>
            <LicenseApplicationReviewSidebar application={license} onUpdated={setLicenseApp} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {backLink}
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-lg font-medium text-foreground">Application not found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            This submission may not be linked to a validated online payment intake, or the link is
            incorrect.
          </p>
          <Button className="mt-6" asChild>
            <Link href={HYDROLOGICAL_APU_LIST_PATH}>View all submissions</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
