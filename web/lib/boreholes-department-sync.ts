import type { QueryClient } from '@tanstack/react-query'

export const BOREHOLE_REGISTRY_QUEUE_KEY = ['borehole-registry-queue'] as const
export const BOREHOLES_DASHBOARD_KEY = ['boreholes-dashboard'] as const

export function invalidateBoreholesDepartmentQueries(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: ['erp-reference-data'] })
  void queryClient.invalidateQueries({ queryKey: BOREHOLE_REGISTRY_QUEUE_KEY })
  void queryClient.invalidateQueries({ queryKey: BOREHOLES_DASHBOARD_KEY })
}
