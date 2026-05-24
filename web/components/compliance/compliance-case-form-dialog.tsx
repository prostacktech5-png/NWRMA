'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ComplianceLicenseCombobox } from '@/components/compliance/compliance-license-combobox'
import type { LroComplianceCase } from '@/lib/lro-store'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: LroComplianceCase | null
  onSubmit: (values: {
    entityName: string
    violationType: string
    workstream: string
    planYear: string
    assignedOfficer: string
    dueDate: string
    notes: string
    licenseReference: string | null
  }) => Promise<void>
}

export function ComplianceCaseFormDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const [busy, setBusy] = useState(false)
  const [entityName, setEntityName] = useState(initial?.entityName ?? '')
  const [violationType, setViolationType] = useState(initial?.violationType ?? '')
  const [workstream, setWorkstream] = useState(initial?.workstream ?? '')
  const [planYear, setPlanYear] = useState(initial?.planYear ?? String(new Date().getFullYear()))
  const [assignedOfficer, setAssignedOfficer] = useState(initial?.assignedOfficer ?? '')
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [licenseReference, setLicenseReference] = useState(initial?.licenseReference ?? '')

  const isEdit = Boolean(initial)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!entityName.trim() || !violationType.trim()) return
    setBusy(true)
    try {
      await onSubmit({
        entityName: entityName.trim(),
        violationType: violationType.trim(),
        workstream: workstream.trim(),
        planYear: planYear.trim(),
        assignedOfficer: assignedOfficer.trim(),
        dueDate,
        notes: notes.trim(),
        licenseReference: licenseReference.trim() || null,
      })
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit case' : 'New compliance case'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="entityName">Entity / operator</Label>
            <Input
              id="entityName"
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="violationType">Violation type</Label>
            <Input
              id="violationType"
              value={violationType}
              onChange={(e) => setViolationType(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="workstream">Workstream</Label>
              <Input id="workstream" value={workstream} onChange={(e) => setWorkstream(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="planYear">Plan year</Label>
              <Input id="planYear" value={planYear} onChange={(e) => setPlanYear(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="assignedOfficer">Assigned officer</Label>
              <Input
                id="assignedOfficer"
                value={assignedOfficer}
                onChange={(e) => setAssignedOfficer(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Licence link</Label>
            <ComplianceLicenseCombobox
              value={licenseReference}
              onChange={(ref) => setLicenseReference(ref)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? 'Save' : 'Create case'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
