'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, MinusCircle, PlusCircle, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { resolvedApiUrl } from '@/lib/apiBase'
import {
  fetchErpPortalDepartmentBudget,
  useErpPortalForm,
} from '@/hooks/use-erp-portal-form'
import { formatNLe } from '@/lib/mock-data'
import { DEFAULT_PUBLIC_LOGO_PATH } from '@/lib/app-branding'
import {
  PublicPortalDeptBudgetFields,
  type PublicFormBudgetLine,
} from '@/components/public-portal/public-portal-dept-budget-fields'
import type { CanonicalDept } from '@/lib/orgDepartments'

type ItemRow = {
  id: number
  itemName: string
  itemDescription: string
  unitCost: string
  quantity: string
}

function createItemRow(id: number): ItemRow {
  return {
    id,
    itemName: '',
    itemDescription: '',
    unitCost: '1',
    quantity: '1',
  }
}

const DEFAULT_APP_NAME = 'NWRMA'

export type HydrologicalPublicRequisitionFormProps =
  | {
      mode?: 'public'
      token: string
      embedded?: boolean
      onSuccess?: () => void
    }
  | {
      mode: 'erp'
      actingUserHeaders: Record<string, string>
      enabled?: boolean
      embedded?: boolean
      onSuccess?: () => void
      sessionPrefill?: {
        name: string
        email: string
        department: CanonicalDept | null
        lockDepartment: boolean
      }
    }

function requisitionsHrefForDepartment(dept: CanonicalDept | ''): string {
  if (dept === 'hydrological') return '/hydrological/budget/requisitions'
  if (dept === 'financial') return '/finance/requisitions'
  if (dept === 'hr') return '/hr/requisitions'
  return '/hydrological/budget/requisitions'
}

export function HydrologicalPublicRequisitionForm(props: HydrologicalPublicRequisitionFormProps) {
  const mode = props.mode ?? 'public'
  const isErp = mode === 'erp'
  const embedded = props.embedded ?? isErp
  const onSuccess = props.onSuccess
  const appName = DEFAULT_APP_NAME
  const apiToken = props.mode === 'erp' ? '' : encodeURIComponent(props.token)
  const actingUserHeaders = props.mode === 'erp' ? props.actingUserHeaders : {}
  const enabled = props.mode === 'erp' ? (props.enabled ?? true) : true
  const sessionPrefill = props.mode === 'erp' ? props.sessionPrefill : undefined

  const portalQuery = useErpPortalForm(actingUserHeaders, isErp && enabled)

  const [loading, setLoading] = useState(!isErp)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [departments, setDepartments] = useState<Array<{ id: CanonicalDept; label: string }>>([])
  const [budgetLinesByDepartment, setBudgetLinesByDepartment] = useState<
    Record<string, PublicFormBudgetLine[]>
  >({})
  const [budgetCode, setBudgetCode] = useState('')

  const [items, setItems] = useState<ItemRow[]>([createItemRow(1)])
  const [nextItemId, setNextItemId] = useState(2)
  const [requestedBy, setRequestedBy] = useState(sessionPrefill?.name ?? '')
  const [requesterEmail, setRequesterEmail] = useState(sessionPrefill?.email ?? '')

  const [submitting, setSubmitting] = useState(false)
  const [doneId, setDoneId] = useState<number | null>(null)
  const [lockDepartment, setLockDepartment] = useState(sessionPrefill?.lockDepartment ?? false)
  const [department, setDepartment] = useState<CanonicalDept | ''>(sessionPrefill?.department ?? '')

  useEffect(() => {
    if (!isErp || !portalQuery.data) return
    const body = portalQuery.data
    setDepartments(body.departments)
    setBudgetLinesByDepartment((prev) => ({ ...prev, ...body.budgetLinesByDepartment }))
    setRequestedBy(body.prefill.name)
    setRequesterEmail(body.prefill.email)
    setLockDepartment(body.prefill.lockDepartment)
    if (body.prefill.department) {
      setDepartment(body.prefill.department)
      setBudgetCode((code) => {
        if (code) return code
        return body.budgetLinesByDepartment[body.prefill.department!]?.[0]?.code ?? ''
      })
    }
  }, [isErp, portalQuery.data])

  useEffect(() => {
    if (!isErp || !department || !enabled) return
    if ((budgetLinesByDepartment[department]?.length ?? 0) > 0) return
    let cancelled = false
    void (async () => {
      try {
        const { budgetLinesByDepartment: extra } = await fetchErpPortalDepartmentBudget(
          actingUserHeaders,
          department,
        )
        if (!cancelled) {
          setBudgetLinesByDepartment((prev) => ({ ...prev, ...extra }))
          setBudgetCode((code) => code || extra[department]?.[0]?.code || '')
        }
      } catch {
        /* optional lazy load */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [department, isErp, enabled, actingUserHeaders, budgetLinesByDepartment])

  useEffect(() => {
    if (isErp) return
    if (!enabled) {
      setLoading(true)
      setError(null)
      return
    }

    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const url = resolvedApiUrl(`/api/hydrological/public-staff-requisition/${apiToken}`)
        const r = await fetch(url, { credentials: 'omit' })
        const body = (await r.json().catch(() => ({}))) as {
          error?: string
          departments?: Array<{ id: CanonicalDept; label: string }>
          budgetLinesByDepartment?: Record<string, PublicFormBudgetLine[]>
        }
        if (!r.ok) {
          throw new Error(typeof body.error === 'string' ? body.error : 'Could not open this link')
        }
        if (!cancelled) {
          setDepartments(body.departments ?? [])
          setBudgetLinesByDepartment(body.budgetLinesByDepartment ?? {})
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load form')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [apiToken, isErp, actingUserHeaders, enabled, reloadKey])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (items.length === 0) {
      setError('Add at least one item.')
      return
    }

    const normalizedItems: Array<{
      itemName: string
      itemDescription: string
      unit: number
      qty: number
      total: number
    }> = []

    for (const row of items) {
      const itemName = row.itemName.trim()
      const itemDescription = row.itemDescription.trim()
      const unit = Number.parseFloat(row.unitCost)
      const qty = Number.parseFloat(row.quantity)

      if (itemName.length < 3 || itemName.length > 20) {
        setError('Each item name must be 3-20 characters.')
        return
      }
      if (itemDescription.length < 2 || itemDescription.length > 100) {
        setError('Each item description must be 2-100 characters.')
        return
      }
      if (!Number.isFinite(unit) || unit <= 0) {
        setError('Enter a valid unit cost for each item.')
        return
      }
      if (!Number.isFinite(qty) || qty <= 0) {
        setError('Enter a valid quantity for each item.')
        return
      }

      normalizedItems.push({
        itemName,
        itemDescription,
        unit,
        qty,
        total: unit * qty,
      })
    }

    const n = normalizedItems.reduce((sum, r) => sum + r.total, 0)
    if (!Number.isFinite(n) || n <= 0) {
      setError('Request total must be greater than zero.')
      return
    }

    if (!department || !budgetCode) {
      setError('Select a department and budget code.')
      return
    }
    setSubmitting(true)
    try {
      const url =
        isErp ?
          resolvedApiUrl('/api/erp/portal-requests/staff')
        : resolvedApiUrl(`/api/hydrological/public-staff-requisition/${apiToken}`)
      const r = await fetch(url, {
        method: 'POST',
        credentials: isErp ? 'same-origin' : 'omit',
        headers: {
          'Content-Type': 'application/json',
          ...(isErp ? actingUserHeaders : {}),
        },
        body: JSON.stringify({
          title:
            normalizedItems.length === 1
              ? normalizedItems[0]?.itemName
              : `Procurement items (${normalizedItems.length})`,
          description: normalizedItems
            .map(
              (row, i) =>
                `#${i + 1} ${row.itemName} - ${row.itemDescription} | Unit: NLe ${row.unit.toFixed(2)} | Qty: ${row.qty} | Total: NLe ${row.total.toFixed(2)}`,
            )
            .join(' || '),
          requestedBy: requestedBy.trim(),
          requesterEmail: requesterEmail.trim().toLowerCase(),
          amount: n,
          department,
          budgetCode,
        }),
      })
      const body = (await r.json().catch(() => ({}))) as { error?: string; id?: number }
      if (!r.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Submit failed')
      setDoneId(typeof body.id === 'number' ? body.id : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedProgramme = useMemo(() => {
    if (!department || !budgetCode) return null
    return (budgetLinesByDepartment[department] ?? []).find((b) => b.code === budgetCode) ?? null
  }, [department, budgetCode, budgetLinesByDepartment])

  const erpLoadError =
    isErp && portalQuery.isError ?
      portalQuery.error instanceof Error ?
        portalQuery.error.message
      : 'Could not load form'
    : null
  const displayError = error ?? erpLoadError

  const budgetLoading =
    isErp &&
    Boolean(department) &&
    (portalQuery.isLoading || portalQuery.isFetching) &&
    (budgetLinesByDepartment[department]?.length ?? 0) === 0

  const showFullPageLoader =
    (!isErp && loading) ||
    (isErp && !sessionPrefill && portalQuery.isLoading && !portalQuery.data)

  const blocked = !isErp && departments.length === 0
  const shellClass = embedded ? 'py-2' : 'bg-muted/30 min-h-screen px-4 py-10'

  if (
    isErp &&
    erpLoadError &&
    !portalQuery.data &&
    !sessionPrefill &&
    doneId === null
  ) {
    return (
      <div className={embedded ? 'py-4' : `${shellClass} flex flex-col items-center justify-center`}>
        <div className="bg-card w-full max-w-md rounded-xl border p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold">Could not load form</h1>
          <p className="text-muted-foreground mt-2 text-sm">{erpLoadError}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => void portalQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (showFullPageLoader) {
    return (
      <div className={embedded ? 'flex items-center justify-center py-12' : `${shellClass} flex items-center justify-center`}>
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading form…
        </div>
      </div>
    )
  }

  if (displayError && !isErp && departments.length === 0 && doneId === null) {
    return (
      <div className={embedded ? 'py-4' : `${shellClass} flex flex-col items-center justify-center`}>
        <div className="bg-card w-full max-w-md rounded-xl border p-6 text-center shadow-sm">
          {!isErp ? (
            <img
              src={DEFAULT_PUBLIC_LOGO_PATH}
              alt=""
              className="mx-auto mb-3 h-12 w-12 object-contain opacity-90"
            />
          ) : null}
          <h1 className="text-lg font-semibold">{isErp ? 'Could not load form' : 'Link unavailable'}</h1>
          <p className="text-muted-foreground mt-2 text-sm">{displayError}</p>
          {isErp ? (
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => void portalQuery.refetch()}
            >
              Retry
            </Button>
          ) : null}
        </div>
      </div>
    )
  }

  if (doneId !== null) {
    return (
      <div className={embedded ? 'space-y-4 py-2' : `${shellClass} flex flex-col items-center justify-center`}>
        <div className="bg-card w-full max-w-md space-y-4 rounded-xl border p-6 text-center shadow-sm">
          <h1 className="text-foreground text-xl font-semibold">Request received</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your procurement / petty cash request was submitted. Reference ID:{' '}
            <strong className="text-foreground tabular-nums">{doneId}</strong>. Your Head of Department will review
            and release it to Finance.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            {isErp ? (
              <Button variant="outline" asChild>
                <Link href={requisitionsHrefForDepartment(department)}>View requisitions</Link>
              </Button>
            ) : null}
            {onSuccess ? (
              <Button type="button" onClick={onSuccess}>
                Close
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  const requestTotal = items.reduce((sum, row) => {
    const unit = Number.parseFloat(row.unitCost)
    const qty = Number.parseFloat(row.quantity)
    if (!Number.isFinite(unit) || !Number.isFinite(qty)) return sum
    return sum + unit * qty
  }, 0)

  function updateItemRow(id: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  function addItemRow() {
    setItems((prev) => [...prev, createItemRow(nextItemId)])
    setNextItemId((n) => n + 1)
  }

  function removeItemRow(id: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((row) => row.id !== id) : prev))
  }

  return (
    <div className={shellClass}>
      <div className={embedded ? 'w-full' : 'mx-auto max-w-lg'}>
        {!isErp ? (
          <div className="text-foreground mb-8 flex flex-col items-center gap-2 text-center">
            <img src={DEFAULT_PUBLIC_LOGO_PATH} alt="" className="h-16 w-16 object-contain" />
            <span className="text-lg font-semibold">{appName}</span>
            <p className="text-muted-foreground text-xs uppercase tracking-widest">NWRMA — public request</p>
          </div>
        ) : null}

        <div
          className={cn(
            'bg-card space-y-5 rounded-xl border shadow-sm',
            isErp && embedded ? 'p-4' : 'p-6',
          )}
        >
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {isErp && embedded ?
                'Procurement / petty cash request form'
              : 'Procurement / petty cash request'}
            </h1>
          </div>

          {blocked && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              No programme budgets are configured yet. Ask Finance to set up budget lines, then try again.
            </p>
          )}

          {!blocked && (
            <form onSubmit={onSubmit} className="space-y-4">
              {displayError && isErp ? (
                <p className="text-destructive text-sm">{displayError}</p>
              ) : null}
              <PublicPortalDeptBudgetFields
                departments={departments}
                budgetLinesByDepartment={budgetLinesByDepartment}
                department={department}
                budgetCode={budgetCode}
                onDepartmentChange={(dept) => {
                  setDepartment(dept)
                  const first = budgetLinesByDepartment[dept]?.[0]?.code ?? ''
                  setBudgetCode(first)
                }}
                onBudgetCodeChange={setBudgetCode}
                selectedProgramme={selectedProgramme}
                lockDepartment={lockDepartment}
                budgetLoading={budgetLoading}
              />
              <div className="space-y-3">
                {items.map((row, i) => {
                  const unit = Number.parseFloat(row.unitCost)
                  const qty = Number.parseFloat(row.quantity)
                  const rowTotal = Number.isFinite(unit) && Number.isFinite(qty) ? unit * qty : 0
                  const isLast = i === items.length - 1
                  return (
                    <div key={row.id} className="border-border space-y-2 border-b pb-3 last:border-b-0">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-sm font-medium" htmlFor={`pub-item-name-${row.id}`}>
                            Item Name *
                          </label>
                          <input
                            id={`pub-item-name-${row.id}`}
                            required
                            minLength={3}
                            maxLength={20}
                            value={row.itemName}
                            onChange={(e) => updateItemRow(row.id, { itemName: e.target.value })}
                            className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
                            placeholder="Item Name"
                          />
                          <p className="text-muted-foreground text-xs">Maximum of 20 characters</p>
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-sm font-medium" htmlFor={`pub-item-description-${row.id}`}>
                            Description *
                          </label>
                          <input
                            id={`pub-item-description-${row.id}`}
                            required
                            minLength={2}
                            maxLength={100}
                            value={row.itemDescription}
                            onChange={(e) => updateItemRow(row.id, { itemDescription: e.target.value })}
                            className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
                            placeholder="description"
                          />
                          <p className="text-muted-foreground text-xs">Maximum of 100 characters</p>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium" htmlFor={`pub-unit-cost-${row.id}`}>
                            Unit Cost *
                          </label>
                          <input
                            id={`pub-unit-cost-${row.id}`}
                            required
                            type="number"
                            min={0.01}
                            step={0.01}
                            value={row.unitCost}
                            onChange={(e) => updateItemRow(row.id, { unitCost: e.target.value })}
                            className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm tabular-nums"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium" htmlFor={`pub-qty-${row.id}`}>
                            Quantity
                          </label>
                          <input
                            id={`pub-qty-${row.id}`}
                            required
                            type="number"
                            min={1}
                            step={1}
                            value={row.quantity}
                            onChange={(e) => updateItemRow(row.id, { quantity: e.target.value })}
                            className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm tabular-nums"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium" htmlFor={`pub-total-${row.id}`}>
                            Total
                          </label>
                          <input
                            id={`pub-total-${row.id}`}
                            type="text"
                            readOnly
                            value={rowTotal.toFixed(2)}
                            className="border-input bg-muted w-full rounded-lg border px-3 py-2 text-sm tabular-nums"
                          />
                        </div>
                      </div>
                      {isLast && (
                        <div className="flex items-center justify-end gap-2">
                          <div className="text-muted-foreground mr-2 text-sm">
                            Request total:{' '}
                            <strong className="text-foreground tabular-nums">{formatNLe(requestTotal)}</strong>
                          </div>
                          <button
                            type="button"
                            onClick={addItemRow}
                            className="inline-flex items-center rounded-md border border-blue-300 bg-blue-50 px-2 py-1 text-blue-700 hover:bg-blue-100"
                            aria-label="Add item row"
                            title="Add item"
                          >
                            <PlusCircle className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItemRow(row.id)}
                            disabled={items.length <= 1}
                            className="inline-flex items-center rounded-md border border-red-300 bg-red-50 px-2 py-1 text-red-700 hover:bg-red-100 disabled:opacity-50"
                            aria-label="Remove item row"
                            title="Remove item"
                          >
                            <MinusCircle className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="pub-by">
                  Your name
                </label>
                <input
                  id="pub-by"
                  required
                  minLength={2}
                  maxLength={200}
                  value={requestedBy}
                  onChange={(e) => setRequestedBy(e.target.value)}
                  className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="Full name and optional phone or email"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="pub-email">
                  Email address
                </label>
                <input
                  id="pub-email"
                  required
                  type="email"
                  value={requesterEmail}
                  onChange={(e) => setRequesterEmail(e.target.value)}
                  className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="name@example.com"
                />
              </div>

              {error && (
                <p className="bg-destructive/5 border-destructive/25 text-destructive rounded-lg border px-3 py-2 text-sm">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white',
                  'bg-blue-600 hover:bg-blue-700 disabled:opacity-50',
                )}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit request
                  </>
                )}
              </button>
            </form>
          )}
        </div>
        {!isErp ? (
          <p className="text-muted-foreground mt-8 text-center text-[11px]">
            National Water Resources Management Agency — departmental request portal
          </p>
        ) : null}
      </div>
    </div>
  )
}
