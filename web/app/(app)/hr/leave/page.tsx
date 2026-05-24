'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { HodLeaveApprovalQueue } from '@/components/hr/hod-leave-queue'
import { useSessionUser } from '@/components/demo-session-provider'
import { resolvedApiUrl } from '@/lib/apiBase'
import { formatDateValue } from '@/lib/erp-formatting'

type LeaveRow = {
  id: string
  employeeId: string
  employeeName: string
  type: string
  start: string
  end: string
  status: string
  comment: string
}

type EmployeeJson = { id: string; fullName: string }

export default function HrLeavePage() {
  const { user, actingUserHeaders } = useSessionUser()
  const [leaves, setLeaves] = useState<LeaveRow[]>([])
  const [employees, setEmployees] = useState<EmployeeJson[]>([])
  const [loading, setLoading] = useState(true)
  const [employeeId, setEmployeeId] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [type, setType] = useState('annual')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [lRes, eRes] = await Promise.all([
        fetch(resolvedApiUrl('/api/hr/leave'), {
          headers: { ...actingUserHeaders },
          credentials: 'same-origin',
        }),
        fetch(resolvedApiUrl('/api/hr/employees'), {
          headers: { ...actingUserHeaders },
          credentials: 'same-origin',
        }),
      ])
      const lData = await lRes.json().catch(() => ({}))
      const eData = await eRes.json().catch(() => ({}))
      if (lRes.ok) setLeaves((lData.leaves ?? []) as LeaveRow[])
      if (eRes.ok) setEmployees((eData.employees ?? []) as EmployeeJson[])
    } finally {
      setLoading(false)
    }
  }, [actingUserHeaders])

  useEffect(() => {
    void load()
  }, [load])

  const submitLeave = async () => {
    setSubmitting(true)
    try {
      await fetch(resolvedApiUrl('/api/hr/leave'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...actingUserHeaders },
        credentials: 'same-origin',
        body: JSON.stringify({ employeeId, start, end, type, comment }),
      })
      setEmployeeId('')
      setStart('')
      setEnd('')
      setComment('')
      await load()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Leave management</h1>
        <p className="text-muted-foreground">HR HoD review, then Director General approval</p>
      </div>

      <HodLeaveApprovalQueue viewer={user} onDecided={load} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            New leave request
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label>Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
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
          </div>
          <div className="grid gap-2">
            <Label>From</Label>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>To</Label>
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="annual">Annual</SelectItem>
                <SelectItem value="sick">Sick</SelectItem>
                <SelectItem value="maternity">Maternity</SelectItem>
                <SelectItem value="paternity">Paternity</SelectItem>
                <SelectItem value="compassionate">Compassionate</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Reason</Label>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
          </div>
          <Button
            disabled={!employeeId || !start || !end || submitting}
            onClick={() => void submitLeave()}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit request'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All leave requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaves.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.employeeName}</TableCell>
                    <TableCell>{l.type}</TableCell>
                    <TableCell>
                      {formatDateValue(l.start)} – {formatDateValue(l.end)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{l.status}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                      {l.comment}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
