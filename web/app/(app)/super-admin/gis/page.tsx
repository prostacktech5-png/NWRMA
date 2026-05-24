'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const SaBoreholesMap = dynamic(
  () => import('@/components/super-admin/sa-boreholes-map'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(70vh,560px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)

export default function SuperAdminGisPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">GIS &amp; maps</h2>
        <p className="text-sm text-muted-foreground">
          Borehole locations across Sierra Leone (OpenStreetMap).
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>National borehole map</CardTitle>
          <CardDescription>Live coordinates from the boreholes registry.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <SaBoreholesMap />
        </CardContent>
      </Card>
    </div>
  )
}
