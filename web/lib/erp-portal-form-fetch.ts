import { resolvedApiUrl } from '@/lib/apiBase'
import type { PublicFormBudgetLine } from '@/components/public-portal/public-portal-dept-budget-fields'
import type { CanonicalDept } from '@/lib/orgDepartments'

export type ErpPortalFormPayload = {
  departments: Array<{ id: CanonicalDept; label: string }>
  budgetLinesByDepartment: Record<string, PublicFormBudgetLine[]>
  prefill: {
    name: string
    email: string
    department: CanonicalDept | null
    lockDepartment: boolean
  }
}

type ErpPortalErrorBody = {
  error?: string
  hint?: string
}

function parseErpFetchError(status: number, body: ErpPortalErrorBody): string {
  if (typeof body.error === 'string' && body.error.trim()) {
    const hint = typeof body.hint === 'string' && body.hint.trim() ? ` ${body.hint.trim()}` : ''
    return `${body.error.trim()}${hint}`
  }
  if (typeof body.hint === 'string' && body.hint.trim()) {
    return body.hint.trim()
  }
  return `Could not load form (HTTP ${status}).`
}

/** Load ERP portal form data (departments, budget lines, user prefill). */
export async function fetchErpPortalFormPayload(
  path: '/api/erp/portal-requests/staff' | '/api/erp/portal-requests/per-diem',
  actingUserHeaders: Record<string, string>,
  options?: { department?: CanonicalDept },
): Promise<ErpPortalFormPayload> {
  const q =
    options?.department ? `?department=${encodeURIComponent(options.department)}` : ''
  const r = await fetch(resolvedApiUrl(`${path}${q}`), {
    credentials: 'same-origin',
    headers: actingUserHeaders,
  })
  const body = (await r.json().catch(() => ({}))) as ErpPortalFormPayload & ErpPortalErrorBody
  if (!r.ok) {
    throw new Error(parseErpFetchError(r.status, body))
  }
  return {
    departments: body.departments ?? [],
    budgetLinesByDepartment: body.budgetLinesByDepartment ?? {},
    prefill: body.prefill ?? {
      name: '',
      email: '',
      department: null,
      lockDepartment: false,
    },
  }
}
