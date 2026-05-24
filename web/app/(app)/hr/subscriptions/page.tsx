'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, Loader2, Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { resolvedApiUrl } from '@/lib/apiBase'
import { useSessionUser } from '@/components/demo-session-provider'
import { formatDateValue } from '@/lib/erp-formatting'

type SubJson = {
  id: string
  name: string
  subscriptionType: string
  vendor: string
  accountRef: string
  cost: number | null
  currency: string
  expiresAt: string
  status: string
  reminderDays: number
  daysUntilExpiry: number
}

function expiryBadge(days: number) {
  if (days < 0) return <Badge variant="destructive">Expired</Badge>
  if (days <= 14) return <Badge variant="destructive">{days}d left</Badge>
  if (days <= 30) return <Badge variant="secondary">{days}d left</Badge>
  return <Badge variant="outline">{days}d left</Badge>
}

export default function HrSubscriptionsPage() {
  const { actingUserHeaders } = useSessionUser()
  const [subs, setSubs] = useState<SubJson[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [renewId, setRenewId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [subType, setSubType] = useState('software')
  const [vendor, setVendor] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [cost, setCost] = useState('')
  const [newExpiry, setNewExpiry] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(resolvedApiUrl('/api/hr/subscriptions'), {
        headers: { ...actingUserHeaders },
        credentials: 'same-origin',
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) setSubs((data.subscriptions ?? []) as SubJson[])
    } finally {
      setLoading(false)
    }
  }, [actingUserHeaders])

  useEffect(() => {
    void load()
  }, [load])

  const stats = useMemo(() => {
    const active = subs.filter((s) => s.status === 'active')
    return {
      active: active.length,
      exp30: active.filter((s) => s.daysUntilExpiry >= 0 && s.daysUntilExpiry <= 30).length,
      exp60: active.filter((s) => s.daysUntilExpiry >= 0 && s.daysUntilExpiry <= 60).length,
      expired: subs.filter((s) => s.daysUntilExpiry < 0 || s.status === 'expired').length,
    }
  }, [subs])

  const save = async () => {
    setBusy(true)
    try {
      const res = await fetch(resolvedApiUrl('/api/hr/subscriptions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...actingUserHeaders },
        credentials: 'same-origin',
        body: JSON.stringify({
          name,
          subscriptionType: subType,
          vendor,
          expiresAt,
          cost: cost ? Number(cost) : null,
        }),
      })
      if (res.ok) {
        setFormOpen(false)
        setName('')
        setVendor('')
        setExpiresAt('')
        setCost('')
        await load()
      }
    } finally {
      setBusy(false)
    }
  }

  const renew = async () => {
    if (!renewId || !newExpiry) return
    setBusy(true)
    try {
      const res = await fetch(resolvedApiUrl(`/api/hr/subscriptions/${renewId}/renew`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...actingUserHeaders },
        credentials: 'same-origin',
        body: JSON.stringify({ expiresAt: newExpiry }),
      })
      if (res.ok) {
        setRenewId(null)
        setNewExpiry('')
        await load()
      }
    } finally {
      setBusy(false)
    }
  }

  const sendReminder = async (id: string) => {
    setBusy(true)
    try {
      await fetch(resolvedApiUrl(`/api/hr/subscriptions/${id}/remind`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...actingUserHeaders },
        credentials: 'same-origin',
        body: JSON.stringify({}),
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Subscription tracker</h1>
          <p className="text-muted-foreground">
            Monitor software licences, certifications, insurance, and vendor renewals.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Register subscription
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.active}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expiring (30d)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-amber-600">{stats.exp30}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expiring (60d)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.exp60}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-destructive">{stats.expired}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : subs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No subscriptions registered. Add licences, insurance, or vendor contracts to track
              renewals.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subs.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="capitalize">{s.subscriptionType}</TableCell>
                    <TableCell>{s.vendor || '—'}</TableCell>
                    <TableCell>{formatDateValue(s.expiresAt)}</TableCell>
                    <TableCell>{expiryBadge(s.daysUntilExpiry)}</TableCell>
                    <TableCell className="space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          setRenewId(s.id)
                          setNewExpiry('')
                        }}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void sendReminder(s.id)}
                      >
                        <Bell className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register subscription</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={subType} onValueChange={setSubType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="certification">Certification</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vendor</Label>
              <Input value={vendor} onChange={(e) => setVendor(e.target.value)} />
            </div>
            <div>
              <Label>Expiry date</Label>
              <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
            <div>
              <Label>Annual cost (SLE)</Label>
              <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={busy || !name || !expiresAt}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renewId} onOpenChange={(o) => !o && setRenewId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renew subscription</DialogTitle>
          </DialogHeader>
          <div>
            <Label>New expiry date</Label>
            <Input type="date" value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)} />
          </div>
          <DialogFooter>
            <Button onClick={() => void renew()} disabled={busy || !newExpiry}>
              Confirm renewal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
