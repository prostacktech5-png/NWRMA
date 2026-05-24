'use client'

import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import {
  fetchErpPortalFormPayload,
  type ErpPortalFormPayload,
} from '@/lib/erp-portal-form-fetch'
import type { CanonicalDept } from '@/lib/orgDepartments'

export const ERP_PORTAL_FORM_QUERY_KEY = ['erp-portal-form'] as const

const PORTAL_FORM_PATH = '/api/erp/portal-requests/staff' as const

export function erpPortalFormQueryOptions(actingUserHeaders: Record<string, string>) {
  return {
    queryKey: ERP_PORTAL_FORM_QUERY_KEY,
    queryFn: () => fetchErpPortalFormPayload(PORTAL_FORM_PATH, actingUserHeaders),
    staleTime: 5 * 60_000,
    enabled: Boolean(actingUserHeaders['X-Acting-User-Id']?.trim()),
  } as const
}

export function useErpPortalForm(actingUserHeaders: Record<string, string>, enabled = true) {
  return useQuery({
    ...erpPortalFormQueryOptions(actingUserHeaders),
    enabled: enabled && erpPortalFormQueryOptions(actingUserHeaders).enabled,
  })
}

export function prefetchErpPortalForm(
  queryClient: QueryClient,
  actingUserHeaders: Record<string, string>,
): Promise<void> {
  return queryClient.prefetchQuery(erpPortalFormQueryOptions(actingUserHeaders))
}

export async function fetchErpPortalDepartmentBudget(
  actingUserHeaders: Record<string, string>,
  department: CanonicalDept,
): Promise<Pick<ErpPortalFormPayload, 'budgetLinesByDepartment'>> {
  const body = await fetchErpPortalFormPayload(PORTAL_FORM_PATH, actingUserHeaders, {
    department,
  })
  return { budgetLinesByDepartment: body.budgetLinesByDepartment }
}
