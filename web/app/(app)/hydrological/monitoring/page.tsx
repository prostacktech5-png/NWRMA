'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  MONITORING_POLL_INTERVAL_MS,
  type MonitoringDashboardPayload,
} from '@/lib/hydro-monitoring-dashboard-types'
import { FloodForecastingDashboard } from '@/components/hydro/flood-forecasting-dashboard'

type MonitoringPayload = {
  windowDays: number
  stationsWithValidatedData: number
  activeFloodAlerts: number
  dashboard: MonitoringDashboardPayload
  stations: unknown[]
}

export default function MonitoringStationsPage() {
  const [data, setData] = useState<MonitoringPayload | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshNonce, setRefreshNonce] = useState(0)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const res = await fetch('/api/hydrological/monitoring/stations?windowDays=30', {
        cache: 'no-store',
        credentials: 'same-origin',
      })
      if (!res.ok) throw new Error(String(res.status))
      const json = (await res.json()) as MonitoringPayload
      if (!json.dashboard) throw new Error('Missing dashboard payload')
      setData(json)
    } catch {
      setLoadError('Could not load monitoring snapshot.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const t = setInterval(() => void load(), MONITORING_POLL_INTERVAL_MS)
    const onVis = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [load])

  const handleRefresh = () => {
    setRefreshNonce((n) => n + 1)
    void load()
  }

  const totalRegistry = data?.stations?.length ?? data?.stationsWithValidatedData ?? 0

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white px-1 pb-8 text-slate-900 sm:px-0">
      {loadError ? (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {loadError}
        </p>
      ) : null}

      {loadError ? null : (
        <FloodForecastingDashboard
          dashboard={data?.dashboard ?? null}
          totalRegistryStations={totalRegistry}
          activeFloodAlerts={data?.activeFloodAlerts ?? 0}
          isLoading={loading && !data}
          refreshing={loading}
          onRefresh={handleRefresh}
          refreshNonce={refreshNonce}
        />
      )}
    </div>
  )
}
