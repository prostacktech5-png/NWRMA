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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ComplianceLicenseCombobox } from '@/components/compliance/compliance-license-combobox'
import type { LroLegalMatter } from '@/lib/lro-store'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: LroLegalMatter | null
  onSubmit: (values: {
    title: string
    matterType: 'byelaw' | 'representation' | 'advisory'
    summary: string
    licenseReference: string | null
  }) => Promise<void>
}

export function ComplianceLegalMatterFormDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const [busy, setBusy] = useState(false)
  const [title, setTitle] = useState(initial?.title ?? '')
  const [matterType, setMatterType] = useState<LroLegalMatter['matterType']>(
    initial?.matterType ?? 'representation'
  )
  const [summary, setSummary] = useState(initial?.summary ?? '')
  const [licenseReference, setLicenseReference] = useState(initial?.licenseReference ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setBusy(true)
    try {
      await onSubmit({
        title: title.trim(),
        matterType,
        summary: summary.trim(),
        licenseReference: licenseReference.trim() || null,
      })
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit legal matter' : 'New legal matter'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={matterType} onValueChange={(v) => setMatterType(v as LroLegalMatter['matterType'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="representation">Legal representation</SelectItem>
                <SelectItem value="byelaw">Byelaw development</SelectItem>
                <SelectItem value="advisory">Advisory</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Licence link</Label>
            <ComplianceLicenseCombobox value={licenseReference} onChange={setLicenseReference} />
          </div>
          <div className="space-y-2">
            <Label>Summary</Label>
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : initial ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
