'use client'

import { useEffect, useState } from 'react'
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
import type { LroRegulationRef } from '@/lib/lro-store'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: LroRegulationRef | null
  onSubmit: (values: {
    category: LroRegulationRef['category']
    title: string
    summary: string
    externalUrl: string | null
  }) => Promise<void>
}

export function ComplianceRegulationFormDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const [busy, setBusy] = useState(false)
  const [category, setCategory] = useState<LroRegulationRef['category']>('Acts')
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [externalUrl, setExternalUrl] = useState('')

  useEffect(() => {
    if (open) {
      setCategory(initial?.category ?? 'Acts')
      setTitle(initial?.title ?? '')
      setSummary(initial?.summary ?? '')
      setExternalUrl(initial?.externalUrl ?? '')
    }
  }, [open, initial])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setBusy(true)
    try {
      await onSubmit({
        category,
        title: title.trim(),
        summary: summary.trim(),
        externalUrl: externalUrl.trim() || null,
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
          <DialogTitle>{initial ? 'Edit regulation' : 'Add regulation'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as LroRegulationRef['category'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Acts">Acts</SelectItem>
                <SelectItem value="Regulations">Regulations</SelectItem>
                <SelectItem value="Policies">Policies</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Summary</Label>
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>External URL (optional)</Label>
            <Input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} type="url" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : initial ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
