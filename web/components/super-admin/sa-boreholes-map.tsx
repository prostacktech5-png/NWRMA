'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { resolvedApiUrl } from '@/lib/apiBase'
import 'leaflet/dist/leaflet.css'

type MapPoint = {
  id: string
  boreholeId: string
  lat: number
  lng: number
}

const SL_BOUNDS: [[number, number], [number, number]] = [
  [6.75, -13.45],
  [10.12, -10.05],
]
const SL_CENTER: [number, number] = [8.42, -11.8]

export default function SaBoreholesMap() {
  const hostRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    let cancelled = false
    let map: import('leaflet').Map | null = null

    ;(async () => {
      try {
        const res = await fetch(resolvedApiUrl('/api/super-admin/gis/boreholes'), {
          credentials: 'include',
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error ?? 'Failed to load map data')
        const points: MapPoint[] = Array.isArray(data.points) ? data.points : []
        const L = (await import('leaflet')).default
        if (cancelled || !el) return
        const bounds = L.latLngBounds(SL_BOUNDS)
        map = L.map(el, {
          scrollWheelZoom: true,
          maxBounds: bounds,
          maxBoundsViscosity: 1,
          minZoom: 7,
        }).setView(SL_CENTER, 8)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map)
        const group = L.layerGroup().addTo(map)
        for (const p of points) {
          L.circleMarker([p.lat, p.lng], {
            radius: 5,
            color: '#1EB53A',
            fillOpacity: 0.8,
          })
            .bindPopup(`<strong>${p.boreholeId}</strong>`)
            .addTo(group)
        }
        if (points.length > 0) {
          const latlngs = points.map((p) => L.latLng(p.lat, p.lng))
          map.fitBounds(L.latLngBounds(latlngs), { padding: [24, 24], maxZoom: 12 })
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Map failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      map?.remove()
    }
  }, [])

  return (
    <div className="relative h-[min(70vh,560px)] w-full overflow-hidden rounded-xl border border-border">
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/30">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : null}
      {error ? (
        <p className="absolute left-4 top-4 z-10 rounded bg-destructive/10 px-3 py-1 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div ref={hostRef} className="h-full w-full" />
    </div>
  )
}
