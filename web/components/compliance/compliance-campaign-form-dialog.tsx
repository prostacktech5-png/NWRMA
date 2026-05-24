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
import type { CommunicationsTheme } from '@/lib/compliance-mock-data'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: {
    title: string
    channel: string
    theme: CommunicationsTheme
    startDate: string | null
    notes: string
  }) => Promise<void>
}

export function ComplianceCampaignFormDialog({ open, onOpenChange, onSubmit }: Props) {
  const [busy, setBusy] = useState(false)
  const [title, setTitle] = useState('')
  const [channel, setChannel] = useState('')
  const [theme, setTheme] = useState<CommunicationsTheme>('awareness')
  const [startDate, setStartDate] = useState('')
  const [notes, setNotes] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !channel.trim()) return
    setBusy(true)
    try {
      await onSubmit({
        title: title.trim(),
        channel: channel.trim(),
        theme,
        startDate: startDate || null,
        notes: notes.trim(),
      })
      onOpenChange(false)
      setTitle('')
      setChannel('')
      setNotes('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New campaign</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Theme</Label>
            <Select value={theme} onValueChange={(v) => setTheme(v as CommunicationsTheme)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="awareness">Public awareness</SelectItem>
                <SelectItem value="image">Agency image</SelectItem>
                <SelectItem value="regularisation">Regularisation</SelectItem>
                <SelectItem value="crisis">Crisis communications</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Channel</Label>
            <Input value={channel} onChange={(e) => setChannel(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Start date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create campaign'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
