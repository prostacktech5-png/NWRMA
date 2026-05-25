'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  Mail,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useDemoSession, useSessionUser } from '@/components/demo-session-provider'
import { RequestAdditionalInfoDialog } from '@/components/forms/request-additional-info-dialog'
import { SuperAdminLicenseActions } from '@/components/super-admin/super-admin-license-actions'
import { invalidateBoreholesDepartmentQueries } from '@/lib/boreholes-department-sync'
import { formatApplicantEmailList } from '@/lib/borehole-license-application'
import { REQUIRED_DOCUMENTS } from '@/lib/borehole-licensing-documents'
import {
  formatDateValue,
  licenseApplicationStatusLabels,
  toIsoDateInputValue,
} from '@/lib/erp-formatting'
import type { BoreholeLicenseApplication, LicenseApplicationStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

function statusBadgeClass(status: LicenseApplicationStatus): string {
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

export function LicenseApplicationReviewSidebar({
  application,
  onUpdated,
}: {
  application: BoreholeLicenseApplication
  onUpdated: (app: BoreholeLicenseApplication) => void
}) {
  const { actingUserHeaders } = useSessionUser()
  const { canAccessSuperAdmin } = useDemoSession()
  const queryClient = useQueryClient()
  const [reviewNote, setReviewNote] = useState(application.reviewNote ?? '')
  const [technicalReportSummary, setTechnicalReportSummary] = useState(
    application.technicalReportSummary ?? ''
  )
  const [inspectionDate, setInspectionDate] = useState(() =>
    toIsoDateInputValue(application.siteInspectionDate)
  )
  const [inspectionNotes, setInspectionNotes] = useState(
    application.siteInspectionNotes ?? ''
  )
  const [error, setError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [additionalInfoOpen, setAdditionalInfoOpen] = useState(false)

  useEffect(() => {
    setInspectionDate(toIsoDateInputValue(application.siteInspectionDate))
    setInspectionNotes(application.siteInspectionNotes ?? '')
    setTechnicalReportSummary(application.technicalReportSummary ?? '')
    setReviewNote(application.reviewNote ?? '')
  }, [application])

  const handleApiResult = (
    data: {
      application?: BoreholeLicenseApplication
      emailWarning?: string
      registryMessage?: string
    },
    successLabel: string,
    notifyApplicantByEmail: boolean
  ) => {
    if (data.application) {
      onUpdated(data.application)
      invalidateBoreholesDepartmentQueries(queryClient)
    }
    const parts = [successLabel]
    if (data.registryMessage) parts.push(data.registryMessage)
    const app = data.application ?? application
    if (notifyApplicantByEmail) {
      if (data.emailWarning) {
        parts.push(`Email not sent: ${data.emailWarning}`)
      } else {
        parts.push(`Notification email sent to ${formatApplicantEmailList(app)}.`)
      }
    }
    setInfoMessage(parts.join(' '))
  }

  const patchStatus = async (
    status: LicenseApplicationStatus,
    noteOverride?: string
  ) => {
    setBusy(status)
    setError(null)
    setInfoMessage(null)
    const note = (noteOverride ?? reviewNote).trim() || null
    try {
      const res = await fetch(`/api/borehole-license-applications/${application.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...actingUserHeaders,
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          status,
          reviewNote: note,
          technicalReportSummary: technicalReportSummary.trim() || null,
        }),
      })
      const data = (await res.json()) as {
        application?: BoreholeLicenseApplication
        error?: string
        emailWarning?: string
        registryMessage?: string
      }
      if (!res.ok) {
        setError(data.error ?? 'Update failed.')
        return
      }
      const labels: Record<string, string> = {
        under_review: 'Marked under review.',
        approved: 'Application approved.',
        rejected: 'Application rejected.',
        additional_info_required: 'Additional information requested.',
      }
      handleApiResult(data, labels[status] ?? 'Updated.', status !== 'under_review')
      if (status === 'additional_info_required' && noteOverride) {
        setReviewNote(noteOverride)
        setAdditionalInfoOpen(false)
      }
    } catch {
      setError('Unable to reach the server.')
    } finally {
      setBusy(null)
    }
  }

  const saveTechnicalReport = async () => {
    setBusy('technicalReport')
    setError(null)
    setInfoMessage(null)
    try {
      const res = await fetch(`/api/borehole-license-applications/${application.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...actingUserHeaders,
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          technicalReportSummary: technicalReportSummary.trim() || null,
        }),
      })
      const data = (await res.json()) as {
        application?: BoreholeLicenseApplication
        error?: string
      }
      if (!res.ok) {
        setError(data.error ?? 'Save failed.')
        return
      }
      if (data.application) {
        onUpdated(data.application)
        invalidateBoreholesDepartmentQueries(queryClient)
      }
      setInfoMessage('Technical report summary saved.')
    } catch {
      setError('Unable to reach the server.')
    } finally {
      setBusy(null)
    }
  }

  const scheduleInspection = async () => {
    if (!inspectionDate) {
      setError('Choose an inspection date.')
      return
    }
    setBusy('inspection')
    setError(null)
    setInfoMessage(null)
    try {
      const res = await fetch(
        `/api/borehole-license-applications/${application.id}/site-inspection`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...actingUserHeaders,
          },
          credentials: 'same-origin',
          body: JSON.stringify({
            date: inspectionDate,
            notes: inspectionNotes.trim() || null,
            technicalReportSummary: technicalReportSummary.trim() || null,
          }),
        }
      )
      const data = (await res.json()) as {
        application?: BoreholeLicenseApplication
        error?: string
        emailWarning?: string
      }
      if (!res.ok) {
        setError(data.error ?? 'Could not schedule inspection.')
        return
      }
      handleApiResult(data, 'Site inspection scheduled.', true)
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
        <p className="text-sm text-muted-foreground">Portal submission for drilling licence</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
          <p className="font-mono font-semibold text-[#0a2647]">{application.reference}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge className={cn('font-normal', statusBadgeClass(application.status))}>
              {licenseApplicationStatusLabels[application.status] ?? application.status}
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
          <p className="mt-1 text-gray-600">{formatApplicantEmailList(application)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Contact email is used as primary; company email is CC when different.
          </p>
        </div>

        <div className="rounded-lg bg-gray-50 p-4">
          <h4 className="font-semibold text-[#0a2647]">Submitted documents</h4>
          <ul className="mt-2 space-y-3 text-sm text-gray-600">
            {REQUIRED_DOCUMENTS.map((doc) => {
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
                    {uploaded && (
                      <span className="mt-0.5 block text-xs text-[#1EB53A]">
                        {count} file{count === 1 ? '' : 's'} attached
                      </span>
                    )}
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
            Applications are typically processed within 10–15 business days.
          </p>
        </div>

        <div className="space-y-2 rounded-lg border border-gray-200 p-4 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[#0072C6]" />
            <span className="font-medium text-[#0a2647]">Important note</span>
          </div>
          <p className="text-gray-600">
            Site inspections assess the adequacy and condition of drilling rigs and equipment.
            A technical report with suitability recommendations follows inspection.
          </p>
        </div>

        <div className="space-y-3 rounded-lg border border-[#0072C6]/30 bg-[#0072C6]/5 p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#0072C6]" />
            <span className="font-medium text-[#0a2647]">Site inspection</span>
          </div>
          {application.siteInspectionDate ? (
            <p className="text-sm text-gray-700">
              Scheduled:{' '}
              <strong>{formatDateValue(application.siteInspectionDate)}</strong>
              {application.siteInspectionNotes ? (
                <span className="mt-1 block text-xs text-muted-foreground">
                  {application.siteInspectionNotes}
                </span>
              ) : null}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="inspectionDate">Inspection date</Label>
            <Input
              id="inspectionDate"
              type="date"
              value={inspectionDate}
              onChange={(e) => setInspectionDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inspectionNotes">Instructions for applicant (optional)</Label>
            <Textarea
              id="inspectionNotes"
              rows={2}
              placeholder="Location, documents to bring, contact on site…"
              value={inspectionNotes}
              onChange={(e) => setInspectionNotes(e.target.value)}
            />
          </div>
          <Button
            type="button"
            className="w-full bg-[#0072C6] hover:bg-[#0072C6]/90"
            disabled={busy !== null}
            onClick={() => void scheduleInspection()}
          >
            {busy === 'inspection' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Schedule site inspection & notify applicant
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="technicalReportSummary">Technical report summary</Label>
          <Textarea
            id="technicalReportSummary"
            rows={3}
            placeholder="Post-inspection findings and licence recommendation…"
            value={technicalReportSummary}
            onChange={(e) => setTechnicalReportSummary(e.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy !== null}
            onClick={() => void saveTechnicalReport()}
          >
            {busy === 'technicalReport' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Save technical report
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reviewNote">Review notes (included in applicant emails)</Label>
          <Textarea
            id="reviewNote"
            rows={3}
            placeholder="Message to include when requesting info or deciding…"
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
          />
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {infoMessage && (
          <p className="rounded-lg border border-[#1EB53A]/30 bg-[#1EB53A]/10 px-3 py-2 text-sm text-gray-800">
            {infoMessage}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full"
            disabled={busy !== null}
            onClick={() => void patchStatus('under_review')}
          >
            {busy === 'under_review' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Mark under review
          </Button>
          <Button
            className="w-full bg-[#1EB53A] hover:bg-[#1EB53A]/90"
            disabled={busy !== null}
            onClick={() => void patchStatus('approved')}
          >
            {busy === 'approved' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Approve
          </Button>
          <Button
            variant="destructive"
            className="w-full"
            disabled={busy !== null}
            onClick={() => void patchStatus('rejected')}
          >
            {busy === 'rejected' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Reject
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            disabled={busy !== null}
            onClick={() => setAdditionalInfoOpen(true)}
          >
            Request additional info
          </Button>
        </div>

        <RequestAdditionalInfoDialog
          open={additionalInfoOpen}
          onOpenChange={setAdditionalInfoOpen}
          applicationReference={application.reference}
          applicantLabel={formatApplicantEmailList(application)}
          busy={busy === 'additional_info_required'}
          onConfirm={(missingInformation) =>
            void patchStatus('additional_info_required', missingInformation)
          }
        />

        {canAccessSuperAdmin ? (
          <SuperAdminLicenseActions
            application={application}
            onUpdated={() => onUpdated(application)}
          />
        ) : null}
      </CardContent>
    </Card>
  )
}
