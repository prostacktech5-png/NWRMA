'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useSessionUser } from '@/components/demo-session-provider'
import { invalidateBoreholesDepartmentQueries } from '@/lib/boreholes-department-sync'
import type { Survey123BoreholeIntake } from '@/lib/types'

export type ApproveBoreholeResult = {
  borehole_id: string
  region: string
  district: string
  chiefdom: string
  settlement_type: string
}

function reviveIntake(raw: Survey123BoreholeIntake): Survey123BoreholeIntake {
  return {
    ...raw,
    receivedAt: new Date(raw.receivedAt),
    createdAt: new Date(raw.createdAt),
    reviewedAt: raw.reviewedAt ? new Date(raw.reviewedAt) : null,
  }
}

export function RegistryReviewActions({
  intake,
  onUpdated,
  onApproved,
  layout = 'footer',
}: {
  intake: Survey123BoreholeIntake
  onUpdated: (intake: Survey123BoreholeIntake) => void
  onApproved?: (result: ApproveBoreholeResult) => void
  layout?: 'footer' | 'sidebar'
}) {
  const { actingUserHeaders } = useSessionUser()
  const queryClient = useQueryClient()
  const [rejectionReason, setRejectionReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [approvedId, setApprovedId] = useState<ApproveBoreholeResult | null>(null)
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)

  const canAct = intake.status === 'received'

  useEffect(() => {
    setRejectionReason('')
    setError(null)
    setInfo(null)
    setApprovedId(null)
    setBusy(null)
  }, [intake.id])

  async function patch(action: 'approve' | 'reject') {
    setBusy(action)
    setError(null)
    setInfo(null)
    try {
      const res = await fetch(`/api/boreholes/survey123-intakes/${intake.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...actingUserHeaders },
        credentials: 'same-origin',
        body: JSON.stringify({
          action,
          rejectionReason: action === 'reject' ? rejectionReason.trim() || null : undefined,
        }),
      })
      const data = (await res.json()) as ApproveBoreholeResult & {
        error?: string
        intake?: Survey123BoreholeIntake
      }
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)

      if (action === 'approve') {
        const result: ApproveBoreholeResult = {
          borehole_id: data.borehole_id,
          region: data.region,
          district: data.district,
          chiefdom: data.chiefdom,
          settlement_type: data.settlement_type,
        }
        setApprovedId(result)
        onApproved?.(result)
        if (data.intake) onUpdated(reviveIntake(data.intake))
        setInfo('Borehole approved and unique ID assigned.')
      } else {
        if (data.intake) onUpdated(reviveIntake(data.intake))
        setInfo('Submission rejected. No borehole ID was assigned.')
      }
      invalidateBoreholesDepartmentQueries(queryClient)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed.')
    } finally {
      setBusy(null)
    }
  }

  if (approvedId) {
    return (
      <div className="space-y-3 rounded-lg border border-secondary/30 bg-secondary/10 p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-secondary">
          <CheckCircle2 className="h-4 w-4" />
          Borehole ID assigned
        </p>
        <pre className="overflow-x-auto font-mono text-xs">{JSON.stringify(approvedId, null, 2)}</pre>
      </div>
    )
  }

  const footerActions = (
    <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 flex-1 space-y-2 sm:max-w-md">
        <Label htmlFor={`rejection-${intake.id}`}>Rejection reason (optional)</Label>
        <Textarea
          id={`rejection-${intake.id}`}
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="Reason if rejecting this submission"
          rows={2}
          disabled={!canAct || busy != null}
        />
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
        <Button
          variant="outline"
          className="gap-2"
          disabled={busy != null || !canAct}
          onClick={() => void patch('reject')}
        >
          {busy === 'reject' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          Reject
        </Button>
        <Button
          className="gap-2"
          disabled={busy != null || !canAct || !intake.mappingComplete}
          onClick={() => void patch('approve')}
        >
          {busy === 'approve' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Approve & assign borehole ID
        </Button>
      </div>
    </div>
  )

  const sidebarActions = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`rejection-${intake.id}`}>Rejection reason (optional)</Label>
        <Textarea
          id={`rejection-${intake.id}`}
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="Reason if rejecting this submission"
          rows={3}
          disabled={!canAct || busy != null}
        />
      </div>
      <Button
        className="w-full gap-2"
        disabled={busy != null || !canAct || !intake.mappingComplete}
        onClick={() => void patch('approve')}
      >
        {busy === 'approve' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        Approve & assign borehole ID
      </Button>
      <Button
        variant="outline"
        className="w-full gap-2"
        disabled={busy != null || !canAct}
        onClick={() => void patch('reject')}
      >
        {busy === 'reject' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
        Reject submission
      </Button>
    </div>
  )

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {info ? <p className="text-sm text-muted-foreground">{info}</p> : null}
      {!canAct ? (
        <p className="text-sm text-muted-foreground capitalize">
          This submission is already {intake.status}.
          {intake.registeredBoreholeCode ? ` Borehole ID: ${intake.registeredBoreholeCode}` : ''}
          {intake.rejectionReason ? ` Reason: ${intake.rejectionReason}` : ''}
        </p>
      ) : layout === 'footer' ? (
        footerActions
      ) : (
        sidebarActions
      )}
    </div>
  )
}



