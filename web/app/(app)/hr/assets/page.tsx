'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Package, Plus } from 'lucide-react'
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

type AssetJson = {
  id: string
  assetTag: string
  name: string
  category: string
  serialNumber: string | null
  condition: string
  status: string
  custodianName: string | null
  location: string
  warrantyExpiry: string | null
}

type EmployeeJson = { id: string; fullName: string }

export default function HrAssetsPage() {
  const { actingUserHeaders } = useSessionUser()
  const [assets, setAssets] = useState<AssetJson[]>([])
  const [employees, setEmployees] = useState<EmployeeJson[]>([])
  const [loading, setLoading] = useState(true)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState<string | null>(null)
  const [tag, setTag] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Laptop')
  const [serial, setSerial] = useState('')
  const [assignEmployeeId, setAssignEmployeeId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [aRes, eRes] = await Promise.all([
        fetch(resolvedApiUrl('/api/hr/assets'), {
          headers: { ...actingUserHeaders },
          credentials: 'same-origin',
        }),
        fetch(resolvedApiUrl('/api/hr/employees'), {
          headers: { ...actingUserHeaders },
          credentials: 'same-origin',
        }),
      ])
      const aData = await aRes.json().catch(() => ({}))
      const eData = await eRes.json().catch(() => ({}))
      if (aRes.ok) setAssets((aData.assets ?? []) as AssetJson[])
      if (eRes.ok) setEmployees((eData.employees ?? []) as EmployeeJson[])
    } finally {
      setLoading(false)
    }
  }, [actingUserHeaders])

  useEffect(() => {
    void load()
  }, [load])

  const registerAsset = async () => {
    const res = await fetch(resolvedApiUrl('/api/hr/assets'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...actingUserHeaders },
      credentials: 'same-origin',
      body: JSON.stringify({ assetTag: tag, name, category, serialNumber: serial }),
    })
    if (res.ok) {
      setRegisterOpen(false)
      setTag('')
      setName('')
      await load()
    }
  }

  const assignAsset = async (assetId: string) => {
    await fetch(resolvedApiUrl(`/api/hr/assets/${encodeURIComponent(assetId)}/assign`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...actingUserHeaders },
      credentials: 'same-origin',
      body: JSON.stringify({ action: 'assign', employeeId: assignEmployeeId }),
    })
    setAssignOpen(null)
    await load()
  }

  const returnAsset = async (assetId: string) => {
    await fetch(resolvedApiUrl(`/api/hr/assets/${encodeURIComponent(assetId)}/assign`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...actingUserHeaders },
      credentials: 'same-origin',
      body: JSON.stringify({ action: 'return', notes: 'Returned to stores' }),
    })
    await load()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Asset register</h1>
          <p className="text-muted-foreground">Track and assign organisation assets to staff</p>
        </div>
        <Button className="gap-2" onClick={() => setRegisterOpen(true)}>
          <Plus className="h-4 w-4" />
          Register asset
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            All assets
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Custodian</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Warranty</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.assetTag}</TableCell>
                    <TableCell>{a.name}</TableCell>
                    <TableCell>{a.category}</TableCell>
                    <TableCell>{a.custodianName ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{a.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {a.warrantyExpiry ? formatDateValue(a.warrantyExpiry) : '—'}
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      {a.status === 'in_use' ? (
                        <Button size="sm" variant="outline" onClick={() => void returnAsset(a.id)}>
                          Return
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setAssignOpen(a.id)}>
                          Assign
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register asset</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Asset tag / barcode</Label>
              <Input value={tag} onChange={(e) => setTag(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Category</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Serial number</Label>
              <Input value={serial} onChange={(e) => setSerial(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => void registerAsset()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen != null} onOpenChange={() => setAssignOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign asset</DialogTitle>
          </DialogHeader>
          <Select value={assignEmployeeId} onValueChange={setAssignEmployeeId}>
            <SelectTrigger>
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              disabled={!assignEmployeeId || !assignOpen}
              onClick={() => assignOpen && void assignAsset(assignOpen)}
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

