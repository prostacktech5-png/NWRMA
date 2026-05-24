'use client'

import { useState } from 'react'
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
import type { LabRequest } from '@/lib/types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: LabRequest
  actingUserHeaders: HeadersInit
  onSuccess: () => void
}

export function WaterTestingInProgressDialog({
  open,
  onOpenChange,
  request,
  actingUserHeaders,
  onSuccess,
}: Props) {
  const [scheduledAt, setScheduledAt] = useState('')
  const [assignedToName, setAssignedToName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!scheduledAt.trim()) {
      toast.error('Choose a date and time for sample collection.')
      return
    }
    const iso = new Date(scheduledAt).toISOString()
    if (Number.isNaN(new Date(scheduledAt).getTime())) {
      toast.error('Invalid date and time.')
      return
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
            action: 'mark_in_progress',
            sampleCollectionScheduledAt: iso,
            assignedToName: assignedToName.trim() || undefined,
          }),
        },
      )
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        emailWarning?: string
      }
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Could not update request.')
        return
      }
      toast.success('Request marked in progress.')
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
      <DialogContent className="sm:max-w-md">
        <form onSubmit={(e) => void handleSubmit(e)}>
          <DialogHeader>
            <DialogTitle>Schedule sample collection</DialogTitle>
            <DialogDescription>
              Reference <span className="font-mono">{request.reference}</span> —{' '}
              {request.siteAddress}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="wt-scheduled-at">Collection date & time</Label>
              <Input
                id="wt-scheduled-at"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wt-assignee">Assigned staff (optional)</Label>
              <Input
                id="wt-assignee"
                value={assignedToName}
                onChange={(e) => setAssignedToName(e.target.value)}
                placeholder="Technician name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Mark in progress'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
