'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { resolvedApiUrl } from '@/lib/apiBase'
import {
  fetchErpPortalDepartmentBudget,
  useErpPortalForm,
} from '@/hooks/use-erp-portal-form'
import { DEFAULT_PUBLIC_LOGO_PATH } from '@/lib/app-branding'
import {
  PublicPortalDeptBudgetFields,
  type PublicFormBudgetLine,
} from '@/components/public-portal/public-portal-dept-budget-fields'
import type { CanonicalDept } from '@/lib/orgDepartments'

const LOCATION_OPTIONS = [
  'Freetown',
  'Bo',
  'Kenema',
  'Makeni',
  'Kono',
  'Port Loko',
  'Kailahun',
  'Moyamba',
] as const

const TRIP_PURPOSES = ['Field/Site Visit', 'Meeting', 'Delivery', 'Other'] as const

const DEFAULT_APP_NAME = 'NWRMA'

function parseNonNegativeAmount(raw: string): number | null {
  const n = Number.parseFloat(raw)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

function formatNle(amount: number): string {
  return `NLe ${amount.toLocaleString('en-SL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function countsFromTravelDates(
  departureDate: string,
  returnDate: string,
): { days: number; nights: number } | null {
  if (!departureDate || !returnDate) return null
  const depart = new Date(`${departureDate}T00:00:00`)
  const ret = new Date(`${returnDate}T00:00:00`)
  if (Number.isNaN(depart.getTime()) || Number.isNaN(ret.getTime()) || ret < depart) return null
  const days = Math.floor((ret.getTime() - depart.getTime()) / 86400000) + 1
  return { days, nights: Math.max(days - 1, 0) }
}

function parseNonNegativeInt(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const n = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(n) || n < 0 || String(n) !== trimmed) return null
  return n
}

export type HydrologicalPublicPerDiemFormProps =
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

export function HydrologicalPublicPerDiemForm(props: HydrologicalPublicPerDiemFormProps) {
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
  const [department, setDepartment] = useState<CanonicalDept | ''>(sessionPrefill?.department ?? '')
  const [budgetCode, setBudgetCode] = useState('')

  const [departureDate, setDepartureDate] = useState('')
  const [returnDate, setReturnDate] = useState('')
  const [fromLocation, setFromLocation] = useState('')
  const [toLocation, setToLocation] = useState('')
  const [transportAmount, setTransportAmount] = useState('')
  const [travelDaysCount, setTravelDaysCount] = useState('')
  const [travelNightsCount, setTravelNightsCount] = useState('')
  const [daysAmount, setDaysAmount] = useState('')
  const [nightsAmount, setNightsAmount] = useState('')
  const [tripPurpose, setTripPurpose] = useState<(typeof TRIP_PURPOSES)[number] | ''>('')
  const [purposeOther, setPurposeOther] = useState('')
  const [requestedBy, setRequestedBy] = useState(sessionPrefill?.name ?? '')
  const [requesterEmail, setRequesterEmail] = useState(sessionPrefill?.email ?? '')

  const [submitting, setSubmitting] = useState(false)
  const [doneId, setDoneId] = useState<number | null>(null)
  const [lockDepartment, setLockDepartment] = useState(sessionPrefill?.lockDepartment ?? false)

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
        const url = resolvedApiUrl(`/api/hydrological/public-per-diem/${apiToken}`)
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
  }, [apiToken, isErp, enabled, reloadKey])

  useEffect(() => {
    const fromDates = countsFromTravelDates(departureDate, returnDate)
    if (!fromDates) return
    setTravelDaysCount(String(fromDates.days))
    setTravelNightsCount(String(fromDates.nights))
  }, [departureDate, returnDate])

  const perDiemCalc = useMemo(() => {
    const transport = parseNonNegativeAmount(transportAmount) ?? 0
    const dayRate = parseNonNegativeAmount(daysAmount) ?? 0
    const nightRate = parseNonNegativeAmount(nightsAmount) ?? 0
    const daysCount = parseNonNegativeInt(travelDaysCount)
    const nightsCount = parseNonNegativeInt(travelNightsCount)
    const daysLineTotal = daysCount !== null ? daysCount * dayRate : 0
    const nightsLineTotal = nightsCount !== null ? nightsCount * nightRate : 0
    return {
      transport,
      daysCount,
      nightsCount,
      dayRate,
      nightRate,
      daysLineTotal,
      nightsLineTotal,
      totalClaim: transport + daysLineTotal + nightsLineTotal,
    }
  }, [transportAmount, travelDaysCount, travelNightsCount, daysAmount, nightsAmount])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!departureDate || !returnDate) {
      setError('Select departure and return dates.')
      return
    }
    const depart = new Date(`${departureDate}T00:00:00`)
    const ret = new Date(`${returnDate}T00:00:00`)
    if (Number.isNaN(depart.getTime()) || Number.isNaN(ret.getTime()) || ret < depart) {
      setError('Return date must be the same day or after departure date.')
      return
    }
    if (!fromLocation || !toLocation) {
      setError('Select both from and to locations.')
      return
    }
    if (!tripPurpose) {
      setError('Select the purpose of your trip.')
      return
    }
    if (tripPurpose === 'Other' && purposeOther.trim().length < 2) {
      setError("Provide trip purpose details for 'Other'.")
      return
    }

    if (parseNonNegativeAmount(transportAmount) === null) {
      setError('Enter a valid transport amount.')
      return
    }
    if (perDiemCalc.daysCount === null) {
      setError('Enter a valid number of days.')
      return
    }
    if (perDiemCalc.nightsCount === null) {
      setError('Enter a valid number of nights.')
      return
    }
    if (parseNonNegativeAmount(daysAmount) === null) {
      setError('Enter a valid day rate.')
      return
    }
    if (parseNonNegativeAmount(nightsAmount) === null) {
      setError('Enter a valid night rate.')
      return
    }
    const transport = perDiemCalc.transport
    const { daysLineTotal, nightsLineTotal, dayRate, nightRate } = perDiemCalc
    const n = perDiemCalc.totalClaim
    if (!Number.isFinite(n) || n <= 0) {
      setError('Total claim must be greater than zero.')
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
          resolvedApiUrl('/api/erp/portal-requests/per-diem')
        : resolvedApiUrl(`/api/hydrological/public-per-diem/${apiToken}`)
      const r = await fetch(url, {
        method: 'POST',
        credentials: isErp ? 'same-origin' : 'omit',
        headers: {
          'Content-Type': 'application/json',
          ...(isErp ? actingUserHeaders : {}),
        },
        body: JSON.stringify({
          title: `Per-diem: ${fromLocation} to ${toLocation}`,
          description: [
            `Travel: ${departureDate} to ${returnDate}`,
            `From/To: ${fromLocation} -> ${toLocation}`,
            `Purpose: ${tripPurpose === 'Other' ? purposeOther.trim() : tripPurpose}`,
            `Transport: NLe ${transport.toFixed(2)}`,
            `Days: ${perDiemCalc.daysCount} × NLe ${dayRate.toFixed(2)} = NLe ${daysLineTotal.toFixed(2)}`,
            `Nights: ${perDiemCalc.nightsCount} × NLe ${nightRate.toFixed(2)} = NLe ${nightsLineTotal.toFixed(2)}`,
            `Total claim: NLe ${n.toFixed(2)}`,
          ].join(' | '),
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
        </div>
      </div>
    )
  }

  if (doneId !== null) {
    return (
      <div className={embedded ? 'space-y-4 py-2' : `${shellClass} flex flex-col items-center justify-center`}>
        <div className="bg-card w-full max-w-md space-y-4 rounded-xl border p-6 text-center shadow-sm">
          <h1 className="text-foreground text-xl font-semibold">Per-diem request received</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your per-diem claim was submitted. Reference ID:{' '}
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

  const {
    totalClaim,
    daysCount,
    nightsCount,
    dayRate,
    nightRate,
    daysLineTotal,
    nightsLineTotal,
  } = perDiemCalc

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
              {isErp && embedded ? 'Per-Diem request form' : 'Per-diem request'}
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="pd-depart-date">
                    Departure Date
                  </label>
                  <input
                    id="pd-depart-date"
                    required
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="pd-return-date">
                    Return Date
                  </label>
                  <input
                    id="pd-return-date"
                    required
                    type="date"
                    value={returnDate}
                    min={departureDate || undefined}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="pd-from-loc">
                  From location
                </label>
                <select
                  id="pd-from-loc"
                  required
                  value={fromLocation}
                  onChange={(e) => setFromLocation(e.target.value)}
                  className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="">Select from location</option>
                  {LOCATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="pd-to-loc">
                  To location
                </label>
                <select
                  id="pd-to-loc"
                  required
                  value={toLocation}
                  onChange={(e) => setToLocation(e.target.value)}
                  className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="">Select to location</option>
                  {LOCATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="pd-transport">
                  Transport amount *
                </label>
                <input
                  id="pd-transport"
                  required
                  type="number"
                  min={0}
                  step={0.01}
                  value={transportAmount}
                  onChange={(e) => setTransportAmount(e.target.value)}
                  className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm tabular-nums"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="pd-days-count">
                    Number of days *
                  </label>
                  <input
                    id="pd-days-count"
                    required
                    type="number"
                    min={0}
                    step={1}
                    value={travelDaysCount}
                    onChange={(e) => setTravelDaysCount(e.target.value)}
                    className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="pd-days-amount">
                    Day rate (NLe per day) *
                  </label>
                  <input
                    id="pd-days-amount"
                    required
                    type="number"
                    min={0}
                    step={0.01}
                    value={daysAmount}
                    onChange={(e) => setDaysAmount(e.target.value)}
                    className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm tabular-nums"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="pd-days-line-total">
                  Days total
                </label>
                <input
                  id="pd-days-line-total"
                  type="text"
                  readOnly
                  value={formatNle(daysLineTotal)}
                  className="border-input bg-muted w-full rounded-lg border px-3 py-2 text-sm tabular-nums"
                />
                <p className="text-muted-foreground text-xs">
                  {daysCount !== null ?
                    `${daysCount} × ${formatNle(dayRate)}`
                  : `0 × ${formatNle(dayRate)}`}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="pd-nights-count">
                    Number of nights *
                  </label>
                  <input
                    id="pd-nights-count"
                    required
                    type="number"
                    min={0}
                    step={1}
                    value={travelNightsCount}
                    onChange={(e) => setTravelNightsCount(e.target.value)}
                    className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="pd-nights-amount">
                    Night rate (NLe per night) *
                  </label>
                  <input
                    id="pd-nights-amount"
                    required
                    type="number"
                    min={0}
                    step={0.01}
                    value={nightsAmount}
                    onChange={(e) => setNightsAmount(e.target.value)}
                    className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm tabular-nums"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="pd-nights-line-total">
                  Nights total
                </label>
                <input
                  id="pd-nights-line-total"
                  type="text"
                  readOnly
                  value={formatNle(nightsLineTotal)}
                  className="border-input bg-muted w-full rounded-lg border px-3 py-2 text-sm tabular-nums"
                />
                <p className="text-muted-foreground text-xs">
                  {nightsCount !== null ?
                    `${nightsCount} × ${formatNle(nightRate)}`
                  : `0 × ${formatNle(nightRate)}`}
                </p>
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">What is the purpose of your trip?</legend>
                {TRIP_PURPOSES.map((purpose) => (
                  <label key={purpose} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="pd-purpose"
                      value={purpose}
                      checked={tripPurpose === purpose}
                      onChange={(e) => setTripPurpose(e.target.value as (typeof TRIP_PURPOSES)[number])}
                    />
                    <span>{purpose}</span>
                  </label>
                ))}
              </fieldset>
              {tripPurpose === 'Other' && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="pd-purpose-other">
                    Other purpose details
                  </label>
                  <input
                    id="pd-purpose-other"
                    required
                    minLength={2}
                    maxLength={120}
                    value={purposeOther}
                    onChange={(e) => setPurposeOther(e.target.value)}
                    className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="pd-by">
                  Your name
                </label>
                <input
                  id="pd-by"
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
                <label className="text-sm font-medium" htmlFor="pd-email">
                  Email address
                </label>
                <input
                  id="pd-email"
                  required
                  type="email"
                  value={requesterEmail}
                  onChange={(e) => setRequesterEmail(e.target.value)}
                  className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="name@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="pd-total-claim">
                  Total claim
                </label>
                <input
                  id="pd-total-claim"
                  type="text"
                  readOnly
                  value={
                    Number.isFinite(totalClaim)
                      ? `NLe ${totalClaim.toLocaleString('en-SL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : 'NLe 0.00'
                  }
                  className="border-input bg-muted w-full rounded-lg border px-3 py-2 text-sm tabular-nums"
                />
                <p className="text-muted-foreground text-xs">
                  Auto calculation: Transport + (Days × day rate) + (Nights × night rate)
                </p>
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
                    Submit per-diem request
                  </>
                )}
              </button>
            </form>
          )}
        </div>
        {!isErp ? (
          <p className="text-muted-foreground mt-8 text-center text-[11px]">
            National Water Resources Management Agency — per-diem portal
          </p>
        ) : null}
      </div>
    </div>
  )
}
