import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { DamSafetyForm } from '@/components/nwrma-site/online-forms/dam-safety-form'
import { EffluentDischargeForm } from '@/components/nwrma-site/online-forms/effluent-discharge-form'
import { WaterRightForm } from '@/components/nwrma-site/online-forms/water-right-form'
import { WaterDrillingLicenceForm } from '@/components/nwrma-site/online-forms/water-drilling-licence-form'
import { getOnlineForm, getOnlineFormSlugs } from '@/lib/nwrma-site/online-forms/registry'

export function generateStaticParams() {
  return getOnlineFormSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const form = getOnlineForm(slug)
  if (!form) return { title: 'Online Forms' }
  return { title: form.title }
}

export default async function OnlineFormSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const form = getOnlineForm(slug)
  if (!form) notFound()

  const formProps = { pdfPath: form.pdfPath, title: form.title }

  if (slug === 'water-drilling-licence') {
    return (
      <Suspense fallback={<p className="nwrma-muted">Loading form…</p>}>
        <WaterDrillingLicenceForm {...formProps} />
      </Suspense>
    )
  }

  if (slug === 'dam-safety') {
    return (
      <Suspense fallback={<p className="nwrma-muted">Loading form…</p>}>
        <DamSafetyForm {...formProps} />
      </Suspense>
    )
  }

  if (slug === 'effluent-discharge') {
    return (
      <Suspense fallback={<p className="nwrma-muted">Loading form…</p>}>
        <EffluentDischargeForm {...formProps} />
      </Suspense>
    )
  }

  if (slug === 'water-right') {
    return (
      <Suspense fallback={<p className="nwrma-muted">Loading form…</p>}>
        <WaterRightForm {...formProps} />
      </Suspense>
    )
  }

  notFound()
}
