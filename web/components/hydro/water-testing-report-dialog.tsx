'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { LabRequest } from '@/lib/types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: LabRequest
  actingUserHeaders: HeadersInit
  onSuccess: () => void
  readOnly?: boolean
}

function slugKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

export function WaterTestingReportDialog({
  open,
  onOpenChange,
  request,
  actingUserHeaders,
  onSuccess,
  readOnly = false,
}: Props) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [reportNotes, setReportNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    const initial: Record<string, string> = {}
    for (const test of request.testsRequested) {
      const key = slugKey(test)
      const existing = request.results?.[key] ?? request.results?.[test]
      initial[key] = existing != null ? String(existing) : ''
    }
    setValues(initial)
    setReportNotes(request.reportNotes ?? '')
  }, [open, request])

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault()
    if (readOnly) return

    const results: Record<string, string> = {}
    for (const test of request.testsRequested) {
      const key = slugKey(test)
      results[key] = values[key]?.trim() ?? ''
    }

    setSubmitting(true)
    try {
      const res = await fetch(
        `/api/hydrological/water-testing/requests/${encodeURIComponent(request.id)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...actingUserHeaders },
          credentials: 'same-origin',
          body: JSON.stringify({
            action: 'complete',
            results,
            reportNotes: reportNotes.trim() || null,
          }),
        },
      )
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        emailWarning?: string
      }
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Could not save report.')
        return
      }
      toast.success('Report completed and client notified.')
      if (data.emailWarning) toast.warning(data.emailWarning)
      onOpenChange(false)
      onSuccess()
    } catch {
      toast.error('Network error. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={(e) => void handleComplete(e)}>
          <DialogHeader>
            <DialogTitle>{readOnly ? 'Test report' : 'Enter test report'}</DialogTitle>
            <DialogDescription>
              Reference <span className="font-mono">{request.reference}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {request.testsRequested.map((test) => {
              const key = slugKey(test)
              return (
                <div className="grid gap-2" key={key}>
                  <Label htmlFor={`result-${key}`}>{test}</Label>
                  <Input
                    id={`result-${key}`}
                    value={values[key] ?? ''}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    readOnly={readOnly}
                    placeholder={readOnly ? '—' : 'Result value'}
                  />
                </div>
              )
            })}
            <div className="grid gap-2">
              <Label htmlFor="wt-report-notes">Laboratory notes</Label>
              <Textarea
                id="wt-report-notes"
                value={reportNotes}
                onChange={(e) => setReportNotes(e.target.value)}
                readOnly={readOnly}
                rows={3}
                placeholder={readOnly ? '' : 'Optional summary or interpretation'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {readOnly ? 'Close' : 'Cancel'}
            </Button>
            {!readOnly && (
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : 'Complete & notify client'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
