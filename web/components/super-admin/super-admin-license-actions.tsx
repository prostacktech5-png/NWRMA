'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { resolvedApiUrl } from '@/lib/apiBase'
import type { BoreholeLicenseApplication, LicenseApplicationStatus } from '@/lib/types'

const ADMIN_STATUSES: LicenseApplicationStatus[] = [
  'draft',
  'submitted',
  'under_review',
  'field_inspection',
  'pending_payment',
  'additional_info_required',
  'approved',
  'rejected',
  'suspended',
  'expired',
  'revoked',
]

export function SuperAdminLicenseActions({
  application,
  onUpdated,
}: {
  application: BoreholeLicenseApplication
  onUpdated?: () => void
}) {
  const [status, setStatus] = useState<LicenseApplicationStatus>(application.status)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const applyStatus = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch(
        resolvedApiUrl(`/api/borehole-license-applications/${application.id}`),
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      )
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(
          data && typeof data === 'object' && 'error' in data
            ? String(data.error)
            : 'Update failed'
        )
      }
      setMessage('Status updated.')
      onUpdated?.()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Super Admin actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label>Workflow status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as LicenseApplicationStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ADMIN_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button className="w-full" disabled={busy} onClick={() => void applyStatus()}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Apply status
        </Button>
        {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
      </CardContent>
    </Card>
  )
}
