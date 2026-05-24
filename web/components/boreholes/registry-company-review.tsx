'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { FileText, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Survey123IntakeReadonlyForm } from '@/components/boreholes/survey123-intake-readonly-form'
import {
  RegistryReviewActions,
  type ApproveBoreholeResult,
} from '@/components/boreholes/registry-review-actions'
import { useErpReference } from '@/components/reference-data-provider'
import type { Survey123BoreholeIntake, Survey123IntakeSummary } from '@/lib/types'

type CompanyOption = {
  companyId: string
  name: string
  pendingCount: number
}

function submissionLabel(p: Survey123IntakeSummary, index: number) {
  const place =
    [p.districtLabel, p.chiefdomLabel].filter(Boolean).join(', ') ||
    p.idPreview ||
    'Pending'
  return `${p.locationDescription ?? `Submission ${index + 1}`} — ${place}`
}

function reviveIntake(raw: Survey123BoreholeIntake): Survey123BoreholeIntake {
  return {
    ...raw,
    receivedAt: new Date(raw.receivedAt),
    createdAt: new Date(raw.createdAt),
    reviewedAt: raw.reviewedAt ? new Date(raw.reviewedAt) : null,
  }
}

export function RegistryCompanyReview({
  pending,
  initialIntakeId,
  actingUserHeaders,
  onQueueChange,
  variant = 'dialog',
}: {
  pending: Survey123IntakeSummary[]
  initialIntakeId?: string | null
  actingUserHeaders: HeadersInit
  onQueueChange?: () => void
  variant?: 'inline' | 'dialog'
}) {
  const { data: erp } = useErpReference()
  const [companyId, setCompanyId] = useState<string>('')
  const [intakeId, setIntakeId] = useState<string>('')
  const [intake, setIntake] = useState<Survey123BoreholeIntake | null>(null)
  const [loadingIntake, setLoadingIntake] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const companyOptions = useMemo((): CompanyOption[] => {
    const byCompany = new Map<string, { name: string; count: number }>()
    for (const p of pending) {
      const id = p.drillingCompanyId
      if (!id) continue
      const name = p.matchedCompanyName ?? p.drillingCompanyName ?? 'Unknown company'
      const cur = byCompany.get(id)
      if (cur) cur.count += 1
      else byCompany.set(id, { name, count: 1 })
    }
    return [...byCompany.entries()]
      .map(([companyId, { name, count }]) => ({
        companyId,
        name,
        pendingCount: count,
      }))
      .filter((o) => {
        const c = erp.drillingCompanies.find((dc) => dc.id === o.companyId)
        return c?.status === 'active'
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [pending, erp.drillingCompanies])

  const companyIntakes = useMemo(() => {
    if (!companyId) return []
    return pending.filter((p) => p.drillingCompanyId === companyId)
  }, [pending, companyId])

  const loadIntake = useCallback(
    async (id: string) => {
      if (!id) {
        setIntake(null)
        return
      }
      setLoadingIntake(true)
      setLoadError(null)
      try {
        const res = await fetch(`/api/boreholes/survey123-intakes/${id}`, {
          headers: { ...actingUserHeaders },
          credentials: 'same-origin',
        })
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(j.error ?? `HTTP ${res.status}`)
        }
        const data = (await res.json()) as { intake: Survey123BoreholeIntake }
        setIntake(reviveIntake(data.intake))
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Failed to load submission.')
        setIntake(null)
      } finally {
        setLoadingIntake(false)
      }
    },
    [actingUserHeaders],
  )

  useEffect(() => {
    if (initialIntakeId && pending.length > 0) {
      const match = pending.find((p) => p.id === initialIntakeId)
      if (match?.drillingCompanyId) {
        setCompanyId(match.drillingCompanyId)
        setIntakeId(match.id)
        return
      }
    }
    if (companyOptions.length === 1 && !companyId) {
      setCompanyId(companyOptions[0]!.companyId)
    }
  }, [initialIntakeId, pending, companyOptions, companyId])

  useEffect(() => {
    if (!companyId) {
      setIntakeId('')
      setIntake(null)
      return
    }
    if (companyIntakes.length === 0) {
      setIntakeId('')
      setIntake(null)
      return
    }
    const stillValid = companyIntakes.some((p) => p.id === intakeId)
    if (!stillValid) {
      const next = companyIntakes[0]!.id
      setIntakeId(next)
    }
  }, [companyId, companyIntakes, intakeId])

  useEffect(() => {
    if (intakeId) void loadIntake(intakeId)
    else setIntake(null)
  }, [intakeId, loadIntake])

  function handleApproved() {
    onQueueChange?.()
    const remaining = companyIntakes.filter((p) => p.id !== intakeId)
    if (remaining.length > 0) {
      setIntakeId(remaining[0]!.id)
    } else {
      setCompanyId('')
      setIntakeId('')
      setIntake(null)
    }
  }

  function handleUpdated(updated: Survey123BoreholeIntake) {
    setIntake(updated)
    if (updated.status !== 'received') {
      onQueueChange?.()
      const remaining = companyIntakes.filter((p) => p.id !== updated.id)
      if (remaining.length > 0) setIntakeId(remaining[0]!.id)
      else {
        setCompanyId('')
        setIntakeId('')
        setIntake(null)
      }
    }
  }

  const selectedSummary = companyIntakes.find((p) => p.id === intakeId)
  const selectedSummaryIndex = selectedSummary
    ? companyIntakes.findIndex((p) => p.id === selectedSummary.id)
    : -1

  const body = (
    <div
      className={
        variant === 'dialog' ?
          'flex min-h-0 flex-1 flex-col gap-4'
        : 'space-y-6'
      }
    >
      <div className="shrink-0 space-y-4 border-b border-border pb-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Drilling company</Label>
            <Select
              value={companyId || '__none__'}
              onValueChange={(v) => setCompanyId(v === '__none__' ? '' : v)}
            >
              <SelectTrigger className="w-full min-w-0">
                <SelectValue placeholder="Select company to review" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Select company…</SelectItem>
                {companyOptions.map((o) => (
                  <SelectItem key={o.companyId} value={o.companyId}>
                    {o.name} ({o.pendingCount} pending)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Submission</Label>
            {!companyId || companyIntakes.length === 0 ? (
              <p className="flex h-9 items-center text-sm text-muted-foreground">—</p>
            ) : companyIntakes.length > 1 ? (
              <Select value={intakeId} onValueChange={setIntakeId}>
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="Select submission" />
                </SelectTrigger>
                <SelectContent>
                  {companyIntakes.map((p, i) => (
                    <SelectItem key={p.id} value={p.id}>
                      {submissionLabel(p, i)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="flex h-9 min-w-0 items-center truncate rounded-md border border-input bg-muted/30 px-3 text-sm">
                {submissionLabel(companyIntakes[0]!, 0)}
              </p>
            )}
          </div>
        </div>

        {companyOptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No companies awaiting review.{' '}
            <Link href="/boreholes/survey123" className="text-primary underline">
              Load demo data on Survey123 Borehole data
            </Link>{' '}
            to test.
          </p>
        ) : null}

        {companyId && companyIntakes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No pending submissions for this company.
          </p>
        ) : null}

        {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
      </div>

      <div
        className={
          variant === 'dialog' ?
            'grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]'
          : 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]'
        }
      >
        <div
          className={
            variant === 'dialog' ?
              'relative min-h-[min(52vh,520px)] min-w-0 overflow-y-auto pr-1'
            : 'relative min-h-[320px] min-w-0'
          }
        >
          {loadingIntake && !intake ? (
            <div className="flex h-full min-h-[inherit] items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading submission…
            </div>
          ) : intake ? (
            <>
              {loadingIntake ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/70">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : null}
              <Survey123IntakeReadonlyForm intake={intake} />
            </>
          ) : !loadingIntake && companyId && companyIntakes.length > 0 ? (
            <p className="text-sm text-muted-foreground">Select a submission to review.</p>
          ) : null}
        </div>

        <aside className="min-w-0 lg:sticky lg:top-0 lg:self-start">
          {intake ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Registry decision</CardTitle>
                {selectedSummary && selectedSummaryIndex >= 0 ? (
                  <CardDescription className="line-clamp-2">
                    {submissionLabel(selectedSummary, selectedSummaryIndex)}
                  </CardDescription>
                ) : null}
              </CardHeader>
              <CardContent>
                <RegistryReviewActions
                  intake={intake}
                  onUpdated={handleUpdated}
                  onApproved={(_result: ApproveBoreholeResult) => handleApproved()}
                  layout="sidebar"
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Approve or reject actions appear here once a submission is loaded.
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  )

  if (variant === 'dialog') {
    return body
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5" />
          Registry
        </CardTitle>
        <CardDescription>
          Select a licensed drilling company to review Survey123 borehole submissions
        </CardDescription>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  )
}
