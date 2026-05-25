'use client'

import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export function RequestAdditionalInfoDialog({
  open,
  onOpenChange,
  applicationReference,
  applicantLabel,
  busy,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  applicationReference: string
  applicantLabel?: string
  busy?: boolean
  onConfirm: (missingInformation: string) => void | Promise<void>
}) {
  const [missingInfo, setMissingInfo] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setMissingInfo('')
      setLocalError(null)
    }
  }, [open])

  const handleSubmit = () => {
    const text = missingInfo.trim()
    if (!text) {
      setLocalError('List the missing information before sending the request.')
      return
    }
    setLocalError(null)
    void onConfirm(text)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request additional information</DialogTitle>
          <DialogDescription>
            Application <span className="font-mono font-semibold">{applicationReference}</span>
            {applicantLabel ? (
              <>
                {' '}
                — {applicantLabel}
              </>
            ) : null}
            . The applicant will receive an email with your list and a link to reopen the same
            online form, complete missing sections, and resubmit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="missing-info-list">Missing information (required)</Label>
          <Textarea
            id="missing-info-list"
            rows={8}
            placeholder={
              'Example:\n• Equipment CLASS A — row 2: Qty available (Compressor minimum 26 PSI)\n• Upload certified copy of business registration\n• Referee 2 address'
            }
            value={missingInfo}
            onChange={(e) => {
              setMissingInfo(e.target.value)
              if (localError) setLocalError(null)
            }}
          />
          <p className="text-xs text-muted-foreground">
            Empty fields on the form are reset so the applicant can fill them again. Other answers
            are kept as submitted.
          </p>
        </div>

        {localError ? (
          <p className="text-sm text-destructive" role="alert">
            {localError}
          </p>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-[#1EB53A] hover:bg-[#1EB53A]/90"
            disabled={busy}
            onClick={handleSubmit}
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
