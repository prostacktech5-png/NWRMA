'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSessionUser } from '@/components/demo-session-provider'
import { createDefaultErpReferencePayload } from '@/lib/erp-reference-defaults'
import type { ErpReferencePayload } from '@/lib/erp-reference-types'
import { reviveIsoDatesDeep } from '@/lib/erp-reference-serialize'
import type { DashboardReferenceSlices } from '@/lib/dashboard-stats'

type Ctx = {
  /** Merged ERP lists — Supabase when online, legacy defaults until fetch succeeds. */
  data: ErpReferencePayload
  isLoading: boolean
  dashboardSlices: DashboardReferenceSlices
}

const ReferenceDataContext = createContext<Ctx | null>(null)

export function ReferenceDataProvider({ children }: { children: ReactNode }) {
  const { actingUserHeaders, user } = useSessionUser()
  const fallback = useMemo(() => createDefaultErpReferencePayload(), [])

  const { data: remote, isLoading } = useQuery({
    queryKey: ['erp-reference-data', user.id],
    queryFn: async () => {
      const res = await fetch('/api/erp/reference-data', {
        headers: { ...actingUserHeaders },
        credentials: 'same-origin',
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }
      const json = (await res.json()) as { payload?: unknown }
      const raw = json.payload ?? json
      return reviveIsoDatesDeep(raw) as ErpReferencePayload
    },
    placeholderData: fallback,
    retry: 1,
    staleTime: 3 * 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: 5 * 60_000,
  })

  const data = remote ?? fallback

  const value = useMemo(() => {
    const dashboardSlices: DashboardReferenceSlices = {
      requisitions: data.requisitions,
      labRequests: data.labRequests,
      budgetLines: data.programmeBudgetLines,
      monitoringStations: data.monitoringStations,
      waterLevelReadings: data.waterLevelReadings,
    }
    return { data, isLoading: isLoading && !remote, dashboardSlices }
  }, [data, isLoading, remote])

  return (
    <ReferenceDataContext.Provider value={value}>{children}</ReferenceDataContext.Provider>
  )
}

export function useErpReference(): Ctx {
  const ctx = useContext(ReferenceDataContext)
  if (!ctx) {
    throw new Error('useErpReference must be used within ReferenceDataProvider')
  }
  return ctx
}
