'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Circle, Clock, Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useSessionUser } from '@/components/demo-session-provider'
import { formatWaterRightApplicantEmailList } from '@/lib/water-right-application'
import { WATER_RIGHT_REQUIRED_SLOTS } from '@/lib/water-right-documents'
import {
  waterRightApplicationStatusLabels,
  formatDateValue,
} from '@/lib/erp-formatting'
import type { WaterRightApplication, WaterRightApplicationStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

function statusBadgeClass(status: WaterRightApplicationStatus): string {
  switch (status) {
    case 'approved':
      return 'bg-secondary/10 text-secondary'
    case 'rejected':
      return 'bg-destructive/10 text-destructive'
    case 'under_review':
      return 'bg-primary/10 text-primary'
    case 'additional_info_required':
      return 'bg-warning/10 text-warning-foreground'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export function WaterRightReviewSidebar({
  application,
  onUpdated,
}: {
  application: WaterRightApplication
  onUpdated: (app: WaterRightApplication) => void
}) {
  const { actingUserHeaders } = useSessionUser()
  const queryClient = useQueryClient()
  const [reviewNote, setReviewNote] = useState(application.reviewNote ?? '')
  const [error, setError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    setReviewNote(application.reviewNote ?? '')
  }, [application])

  const patchStatus = async (status: WaterRightApplicationStatus) => {
    setBusy(status)
    setError(null)
    setInfoMessage(null)
    try {
      const res = await fetch(`/api/water-right-applications/${application.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...actingUserHeaders,
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          status,
          reviewNote: reviewNote.trim() || null,
        }),
      })
      const data = (await res.json()) as {
        application?: WaterRightApplication
        error?: string
        emailWarning?: string
      }
      if (!res.ok) {
        setError(data.error ?? 'Update failed.')
        return
      }
      if (data.application) {
        onUpdated(data.application)
        void queryClient.invalidateQueries({ queryKey: ['erp-reference-data'] })
      }
      const labels: Record<string, string> = {
        under_review: 'Marked under review.',
        approved: 'Application approved.',
        rejected: 'Application rejected.',
        additional_info_required: 'Additional information requested.',
      }
      const parts = [labels[status] ?? 'Updated.']
      if (status !== 'under_review') {
        if (data.emailWarning) {
          parts.push(`Email not sent: ${data.emailWarning}`)
        } else {
          parts.push(
            `Notification email sent to ${formatWaterRightApplicantEmailList(data.application ?? application)}.`
          )
        }
      }
      setInfoMessage(parts.join(' '))
    } catch {
      setError('Unable to reach the server.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card className="sticky top-24 border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-[#0a2647]">Application review</CardTitle>
        <p className="text-sm text-muted-foreground">Water Right — portal submission</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
          <p className="font-mono font-semibold text-[#0a2647]">{application.reference}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge className={cn('font-normal', statusBadgeClass(application.status))}>
              {waterRightApplicationStatusLabels[application.status] ?? application.status}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Submitted {formatDateValue(application.submittedAt)}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
          <div className="flex items-center gap-2 text-[#0a2647]">
            <Mail className="h-4 w-4 text-[#0072C6]" />
            <span className="font-medium">Applicant notifications</span>
          </div>
          <p className="mt-1 text-gray-600">{formatWaterRightApplicantEmailList(application)}</p>
        </div>

        <div className="rounded-lg bg-gray-50 p-4">
          <h4 className="font-semibold text-[#0a2647]">Required attachments</h4>
          <ul className="mt-2 space-y-3 text-sm text-gray-600">
            {WATER_RIGHT_REQUIRED_SLOTS.map((doc) => {
              const count = application.documents?.[doc.id]?.length ?? 0
              const uploaded = count > 0
              return (
                <li key={doc.id} className="flex items-start gap-2">
                  {uploaded ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1EB53A]" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />
                  )}
                  <span>
                    <span className={uploaded ? 'text-gray-700' : ''}>{doc.label}</span>
                    {uploaded ? (
                      <span className="mt-0.5 block text-xs text-[#1EB53A]">
                        {count} file{count === 1 ? '' : 's'} attached
                      </span>
                    ) : null}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="space-y-2 rounded-lg bg-[#0072C6]/5 p-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#0072C6]" />
            <span className="font-medium text-[#0a2647]">Processing time</span>
          </div>
          <p className="text-gray-600">
            Completed applications are typically decided within about 3 months from receipt.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="waterRightReviewNote">Review notes (included in applicant emails)</Label>
          <Textarea
            id="waterRightReviewNote"
            rows={3}
            placeholder="Message when requesting info or deciding…"
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
          />
        </div>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {infoMessage ? (
          <p className="rounded-lg border border-[#1EB53A]/30 bg-[#1EB53A]/10 px-3 py-2 text-sm text-gray-800">
            {infoMessage}
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full"
            disabled={busy !== null}
            onClick={() => void patchStatus('under_review')}
          >
            {busy === 'under_review' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Mark under review
          </Button>
          <Button
            className="w-full bg-[#1EB53A] hover:bg-[#1EB53A]/90"
            disabled={busy !== null}
            onClick={() => void patchStatus('approved')}
          >
            {busy === 'approved' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Approve
          </Button>
          <Button
            variant="destructive"
            className="w-full"
            disabled={busy !== null}
            onClick={() => void patchStatus('rejected')}
          >
            {busy === 'rejected' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Reject
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            disabled={busy !== null}
            onClick={() => void patchStatus('additional_info_required')}
          >
            {busy === 'additional_info_required' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Request additional info
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
