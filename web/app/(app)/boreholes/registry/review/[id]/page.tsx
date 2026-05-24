import { redirect } from 'next/navigation'

export default async function LegacyReviewRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/boreholes/registry?intakeId=${encodeURIComponent(id)}`)
}
