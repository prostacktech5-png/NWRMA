'use client'

import type { MonitoringDataStationsItem } from '@/lib/hydro-monitoring-dashboard-types'
import { SIERRA_LEONE_BOUNDS, normalizeSierraLeoneCoords } from '@/lib/sierra-leone-map-bounds'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { LayerGroup, LatLngBounds, Map as LeafletMap } from 'leaflet'
import 'leaflet/dist/leaflet.css'

const RISK_COLOR: Record<MonitoringDataStationsItem['floodRisk'], string> = {
  low: '#16a34a',
  medium: '#ca8a04',
  high: '#dc2626',
  critical: '#7f1d1d',
}

function stationCoords(s: MonitoringDataStationsItem): { lat: number; lng: number } | null {
  return normalizeSierraLeoneCoords(s.lat, s.lng)
}

function fitSierraLeone(map: LeafletMap, L: typeof import('leaflet').default) {
  const slBounds = L.latLngBounds(SIERRA_LEONE_BOUNDS)
  map.fitBounds(slBounds, { padding: [16, 16], animate: false })
  const countryZoom = map.getBoundsZoom(slBounds, false)
  map.setMinZoom(Math.max(countryZoom - 1, 7))
}

function popupHtml(s: MonitoringDataStationsItem, fill: string, pct: number): string {
  const code = s.code ? ` · ${escapeHtml(s.code)}` : ''
  return [
    '<div style="font-family:system-ui,sans-serif;min-width:10rem">',
    `<div style="font-weight:700">${escapeHtml(s.station)}</div>`,
    `<div style="color:#64748b;font-size:12px">${escapeHtml(s.region)}${code}</div>`,
    `<div style="margin-top:6px;font-size:13px"><strong>${s.latestLevel.toFixed(2)} m</strong> / ${s.threshold} m threshold</div>`,
    `<div style="font-size:12px;color:${fill}">${pct}% · ${escapeHtml(s.floodRisk)}</div>`,
    '</div>',
  ].join('')
}

/** Sierra Leone only — one dot per monitored station with valid catalogue/GPS coordinates. */
export default function MonitoringStationsMap({
  stations,
  mapClassName,
  showHeaderLegend = true,
}: {
  stations: MonitoringDataStationsItem[]
  mapClassName?: string
  showHeaderLegend?: boolean
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const groupRef = useRef<LayerGroup | null>(null)
  const [ready, setReady] = useState(false)

  const plottable = useMemo(
    () =>
      stations
        .map((s) => {
          const coords = stationCoords(s)
          return coords ? { station: s, ...coords } : null
        })
        .filter((x): x is { station: MonitoringDataStationsItem; lat: number; lng: number } =>
          x != null,
        ),
    [stations],
  )

  useEffect(() => {
    const el = hostRef.current
    if (!el) return

    let cancelled = false

    ;(async () => {
      const L = (await import('leaflet')).default
      if (cancelled || !el) return
      if (mapRef.current) return

      const slBounds = L.latLngBounds(SIERRA_LEONE_BOUNDS)
      const map = L.map(el, {
        scrollWheelZoom: true,
        maxBounds: slBounds,
        maxBoundsViscosity: 1,
        minZoom: 7,
        zoomControl: true,
      })
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
        bounds: slBounds,
      }).addTo(map)

      groupRef.current = L.layerGroup().addTo(map)
      fitSierraLeone(map, L)
      setReady(true)
    })()

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      groupRef.current = null
      setReady(false)
    }
  }, [])

  useEffect(() => {
    if (!ready || !mapRef.current || !groupRef.current) return

    ;(async () => {
      const L = (await import('leaflet')).default
      const map = mapRef.current!
      const group = groupRef.current!
      group.clearLayers()

      const slBounds = L.latLngBounds(SIERRA_LEONE_BOUNDS)
      const latlngs: [number, number][] = []

      for (const { station: s, lat, lng } of plottable) {
        latlngs.push([lat, lng])
        const fill = RISK_COLOR[s.floodRisk] ?? '#64748b'
        const pct =
          s.threshold > 0 ? Math.min(100, Math.round((s.latestLevel / s.threshold) * 100)) : 0
        L.circleMarker([lat, lng], {
          radius: 9,
          fillColor: fill,
          color: '#ffffff',
          weight: 2.5,
          opacity: 1,
          fillOpacity: 0.95,
        })
          .bindPopup(popupHtml(s, fill, pct))
          .addTo(group)
      }

      if (latlngs.length === 0) {
        fitSierraLeone(map, L)
        return
      }

      const markerBounds = L.latLngBounds(latlngs)
      const viewBounds = markerBounds.extend(slBounds) as LatLngBounds
      map.fitBounds(viewBounds, { padding: [28, 28], maxZoom: 9, animate: false })
    })()
  }, [plottable, ready])

  const missingCoords = stations.length - plottable.length

  return (
    <div className="relative space-y-2">
      {showHeaderLegend ? (
        <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-600">
          <span className="font-medium text-neutral-800">Legend</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#16a34a]" /> Normal
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#ca8a04]" /> Warning
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#dc2626]" /> Danger
          </span>
        </div>
      ) : null}
      <div
        ref={hostRef}
        className={
          mapClassName ??
          'z-0 h-[min(420px,55vh)] w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100'
        }
        role="application"
        aria-label="Sierra Leone monitoring stations map"
      />
      {!showHeaderLegend ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-md border border-slate-200 bg-white/95 px-3 py-2 text-[11px] text-slate-700 shadow-sm">
          <p className="mb-1 font-semibold text-slate-900">Legend</p>
          <p className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-[#16a34a]" /> Normal (0–70%)
          </p>
          <p className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-[#ca8a04]" /> Warning (70–85%)
          </p>
          <p className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-[#dc2626]" /> Danger (85%+)
          </p>
          {plottable.length > 0 ? (
            <p className="mt-1.5 border-t border-slate-100 pt-1.5 text-slate-500">
              {plottable.length} station{plottable.length === 1 ? '' : 's'} on map
            </p>
          ) : null}
        </div>
      ) : null}
      {stations.length === 0 ? (
        <p className="text-center text-sm text-neutral-500">
          No monitored stations yet — validate readings to show stations on the map.
        </p>
      ) : plottable.length === 0 ? (
        <p className="text-center text-sm text-amber-700">
          Stations are monitored but none have map coordinates yet. Add lat/lng in the station
          registry.
        </p>
      ) : missingCoords > 0 ? (
        <p className="text-center text-xs text-slate-500">
          {missingCoords} monitored station{missingCoords === 1 ? '' : 's'} without map coordinates
          (not shown).
        </p>
      ) : null}
    </div>
  )
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
