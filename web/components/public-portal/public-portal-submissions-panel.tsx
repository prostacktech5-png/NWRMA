'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Plane, RefreshCw, ShoppingCart } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSessionUser } from '@/components/demo-session-provider'
import { departmentNames, formatCurrency, formatDate } from '@/lib/mock-data'
import type { HydroPublicPortalHodWorkflow } from '@/lib/hydro-public-portals-stub'
import { canReleasePortalRequest } from '@/lib/portal-request-policy'
import { toCanonicalDept } from '@/lib/orgDepartments'

type PortalRow = {
  id: number
  kind: 'staff' | 'per_diem'
  title: string
  description: string
  requestedBy: string
  requesterEmail: string
  amount: number
  department: string
  budgetCode: string
  createdAt: string
  hodWorkflow: HydroPublicPortalHodWorkflow
}

function portalHodBadgeClass(w: HydroPublicPortalHodWorkflow) {
  return w === 'pending_hod'
    ? 'bg-amber-500/15 text-amber-900 dark:text-amber-200'
    : 'border border-emerald-200 bg-emerald-50 text-emerald-900 dark:text-emerald-200'
}

function portalHodLabel(w: HydroPublicPortalHodWorkflow) {
  return w === 'pending_hod' ? 'Awaiting HoD' : 'Released'
}

function deptLabel(raw: string) {
  const c = toCanonicalDept(raw)
  return c ? (departmentNames[c] ?? raw) : raw
}

type Props = {
  title?: string
  description?: string
}

export function PublicPortalSubmissionsPanel({
  title = 'Agency public form submissions',
  description,
}: Props) {
  const { actingUserHeaders, user } = useSessionUser()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [portal, setPortal] = useState<PortalRow[]>([])
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'all' | 'staff' | 'per_diem'>('all')
  const [releaseBusyId, setReleaseBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/hydrological/department-requisitions', {
        headers: { ...actingUserHeaders },
        credentials: 'include',
      })
      const body = (await res.json().catch(() => ({}))) as {
        error?: string
        portalSubmissions?: PortalRow[]
      }
      if (!res.ok) {
        setError(body.error ?? 'Could not load public submissions.')
        setPortal([])
        return
      }
      setPortal(body.portalSubmissions ?? [])
    } catch {
      setError('Network error loading public submissions.')
      setPortal([])
    } finally {
      setLoading(false)
    }
  }, [actingUserHeaders])

  useEffect(() => {
    void load()
  }, [load])

  async function releasePortalRequest(id: number, requestDepartment: string) {
    setReleaseBusyId(id)
    try {
      const res = await fetch(
        `/api/hydrological/public-requisitions/${encodeURIComponent(String(id))}/release`,
        { method: 'POST', headers: { ...actingUserHeaders } },
      )
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(body.error ?? 'Could not release request.')
        return
      }
      setError(null)
      await load()
    } finally {
      setReleaseBusyId(null)
    }
  }

  const staffPortal = useMemo(() => portal.filter((p) => p.kind === 'staff'), [portal])
  const perDiemPortal = useMemo(() => portal.filter((p) => p.kind === 'per_diem'), [portal])

  const filterRows = (rows: PortalRow[]) => {
    const needle = search.trim().toLowerCase()
    return rows.filter(
      (r) =>
        !needle ||
        String(r.id).includes(needle) ||
        r.title.toLowerCase().includes(needle) ||
        r.description.toLowerCase().includes(needle) ||
        r.requestedBy.toLowerCase().includes(needle) ||
        r.requesterEmail.toLowerCase().includes(needle) ||
        r.budgetCode.toLowerCase().includes(needle) ||
        deptLabel(r.department).toLowerCase().includes(needle),
    )
  }

  const staffFiltered = filterRows(staffPortal)
  const perDiemFiltered = filterRows(perDiemPortal)
  const showStaff = tab === 'all' || tab === 'staff'
  const showPerDiem = tab === 'all' || tab === 'per_diem'

  const renderTable = (rows: PortalRow[], kind: 'staff' | 'per_diem') => {
    if (rows.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          No {kind === 'staff' ? 'procurement / petty cash' : 'per-diem'} submissions in your queue yet.
        </p>
      )
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ref</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Budget</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Requested by</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>HoD gate</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const canRelease = canReleasePortalRequest(user, r.department)
            return (
              <TableRow key={`${kind}-${r.id}`}>
                <TableCell className="font-mono tabular-nums">{r.id}</TableCell>
                <TableCell className="text-sm">{deptLabel(r.department)}</TableCell>
                <TableCell className="font-mono text-xs">{r.budgetCode}</TableCell>
                <TableCell className="max-w-[12rem]">
                  <div className="font-medium">{r.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{r.description}</div>
                </TableCell>
                <TableCell>
                  <div>{r.requestedBy}</div>
                  <div className="text-xs text-muted-foreground">{r.requesterEmail}</div>
                </TableCell>
                <TableCell className="tabular-nums">{formatCurrency(r.amount)}</TableCell>
                <TableCell>
                  <Badge className={portalHodBadgeClass(r.hodWorkflow)}>
                    {portalHodLabel(r.hodWorkflow)}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDate(new Date(r.createdAt))}
                </TableCell>
                <TableCell className="text-right">
                  {canRelease && r.hodWorkflow === 'pending_hod' ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={releaseBusyId === r.id}
                      onClick={() => void releasePortalRequest(r.id, r.department)}
                    >
                      {releaseBusyId === r.id ? 'Releasing…' : 'Release'}
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:w-56"
          />
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="staff">Procurement</TabsTrigger>
            <TabsTrigger value="per_diem">Per-diem</TabsTrigger>
          </TabsList>
        </Tabs>
        {loading && portal.length === 0 ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : null}
        {showStaff ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <h3 className="font-semibold">Public portal — procurement / petty cash</h3>
            </div>
            {renderTable(staffFiltered, 'staff')}
          </div>
        ) : null}
        {showPerDiem ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Plane className="h-4 w-4" />
              <h3 className="font-semibold">Public portal — per-diem</h3>
            </div>
            {renderTable(perDiemFiltered, 'per_diem')}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
