'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Plane, RefreshCw, Search, ShoppingCart } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { canReleasePortalRequest } from '@/lib/portal-request-policy'
import { toCanonicalDept } from '@/lib/orgDepartments'
import type { HydroPublicPortalHodWorkflow } from '@/lib/hydro-public-portals-stub'
import { departmentNames, formatCurrency, formatDate } from '@/lib/mock-data'
import { resolvedApiUrl } from '@/lib/apiBase'
import { StatusBadge } from '@/components/StatusBadge'

type ErpRequisitionRow = {
  id: number
  title: string
  description: string
  requestedBy: string
  amount: number
  status: string
  createdAt: string
}

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

function portalDeptLabel(raw: string) {
  const c = toCanonicalDept(raw)
  return c ? (departmentNames[c] ?? raw) : raw
}

function portalHodBadgeClass(w: HydroPublicPortalHodWorkflow) {
  return w === 'pending_hod'
    ? 'bg-amber-500/15 text-amber-900 dark:text-amber-200'
    : 'border border-emerald-200 bg-emerald-50 text-emerald-900 dark:text-emerald-200'
}

function portalHodLabel(w: HydroPublicPortalHodWorkflow) {
  return w === 'pending_hod' ? 'Awaiting HoD' : 'Released'
}

export function HydrologicalRequisitionsPage() {
  const { actingUserHeaders, user } = useSessionUser()
  const canActHydroHodFinanceGate =
    user.role === 'hod' && user.department === 'hydrological'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [portal, setPortal] = useState<PortalRow[]>([])
  const [erpRequisitions, setErpRequisitions] = useState<ErpRequisitionRow[]>([])
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'all' | 'staff' | 'per_diem'>('all')
  const [releaseBusyId, setReleaseBusyId] = useState<number | null>(null)
  const [financeDecideBusyId, setFinanceDecideBusyId] = useState<number | null>(null)

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
        erpRequisitions?: ErpRequisitionRow[]
      }
      if (!res.ok) {
        setError(body.error ?? 'Could not load requisitions.')
        setPortal([])
        setErpRequisitions([])
        return
      }
      setPortal(body.portalSubmissions ?? [])
      setErpRequisitions(Array.isArray(body.erpRequisitions) ? body.erpRequisitions : [])
    } catch {
      setError('Network error loading requisitions.')
      setPortal([])
      setErpRequisitions([])
    } finally {
      setLoading(false)
    }
  }, [actingUserHeaders])

  useEffect(() => {
    void load()
  }, [load])

  async function releasePortalRequest(id: number) {
    setReleaseBusyId(id)
    try {
      const res = await fetch(`/api/hydrological/public-requisitions/${encodeURIComponent(String(id))}/release`, {
        method: 'POST',
        headers: { ...actingUserHeaders },
      })
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

  async function decideFinanceRequisition(id: number, action: 'approve' | 'reject') {
    setFinanceDecideBusyId(id)
    try {
      const res = await fetch(resolvedApiUrl(`/api/finance/requisitions/${id}/approve`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...actingUserHeaders },
        credentials: 'include',
        body: JSON.stringify({ action, comment: null }),
      })
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(body.error ?? 'Could not update requisition.')
        return
      }
      setError(null)
      await load()
    } finally {
      setFinanceDecideBusyId(null)
    }
  }

  const staffPortal = useMemo(() => portal.filter((p) => p.kind === 'staff'), [portal])
  const perDiemPortal = useMemo(() => portal.filter((p) => p.kind === 'per_diem'), [portal])

  const staffFiltered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return staffPortal.filter(
      (r) =>
        !needle ||
        String(r.id).includes(needle) ||
        r.title.toLowerCase().includes(needle) ||
        r.description.toLowerCase().includes(needle) ||
        r.requestedBy.toLowerCase().includes(needle) ||
        r.requesterEmail.toLowerCase().includes(needle),
    )
  }, [staffPortal, search])

  const perDiemFiltered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return perDiemPortal.filter(
      (r) =>
        !needle ||
        String(r.id).includes(needle) ||
        r.title.toLowerCase().includes(needle) ||
        r.description.toLowerCase().includes(needle) ||
        r.requestedBy.toLowerCase().includes(needle) ||
        r.requesterEmail.toLowerCase().includes(needle),
    )
  }, [perDiemPortal, search])

  const showStaff = tab === 'all' || tab === 'staff'
  const showPerDiem = tab === 'all' || tab === 'per_diem'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Budget — requisitions</h1>
        </div>
        <Button type="button" variant="outline" className="gap-2" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {error ? (
        <div
          className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Programme budget requisitions (finance workflow)</CardTitle>
        </CardHeader>
        <CardContent>
          {erpRequisitions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hydrological requisitions recorded in Finance yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    {canActHydroHodFinanceGate ? (
                      <TableHead className="text-right text-xs uppercase text-muted-foreground">HoD</TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {erpRequisitions.map((row) => (
                    <TableRow key={`erp-${row.id}`}>
                      <TableCell className="font-mono text-sm">{row.id}</TableCell>
                      <TableCell className="max-w-[220px]">
                        <span className="font-medium">{row.title}</span>
                        {row.description?.trim() ? (
                          <p className="line-clamp-2 text-xs text-muted-foreground">{row.description}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm">{row.requestedBy}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(row.amount)}</TableCell>
                      <TableCell>
                        <StatusBadge status={row.status} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(new Date(row.createdAt))}
                      </TableCell>
                      {canActHydroHodFinanceGate ? (
                        <TableCell className="text-right">
                          {row.status === 'hod_review' ? (
                            <div className="flex justify-end gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="default"
                                className="h-8 px-2 text-xs"
                                disabled={financeDecideBusyId != null}
                                onClick={() => void decideFinanceRequisition(row.id, 'approve')}
                              >
                                {financeDecideBusyId === row.id ?
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : 'Approve'}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-xs"
                                disabled={financeDecideBusyId != null}
                                onClick={() => void decideFinanceRequisition(row.id, 'reject')}
                              >
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Staff procurement / petty cash
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <span className="text-2xl font-bold">{staffPortal.length}</span>
            <ShoppingCart className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Public per-diem</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <span className="text-2xl font-bold">{perDiemPortal.length}</span>
            <Plane className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <CardTitle>Requests</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search ID, names, email, description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="flex h-auto flex-wrap gap-1 py-1">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="staff">Staff procurement / petty cash</TabsTrigger>
              <TabsTrigger value="per_diem">Per-diem</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="mt-6 space-y-8">
            {loading && !portal.length ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : null}

            {showStaff && staffFiltered.length > 0 ? (
              <div className="space-y-3">
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
                        {staffFiltered.map((r) => (
                          <TableRow key={`staff-${r.id}`}>
                            <TableCell className="font-mono tabular-nums">{r.id}</TableCell>
                            <TableCell className="text-sm">{portalDeptLabel(r.department)}</TableCell>
                            <TableCell className="font-mono text-xs">{r.budgetCode}</TableCell>
                            <TableCell className="max-w-[14rem]">
                              <div className="font-medium">{r.title}</div>
                              <div className="truncate text-xs text-muted-foreground">{r.description}</div>
                            </TableCell>
                            <TableCell>
                              <div>{r.requestedBy}</div>
                              <div className="text-xs text-muted-foreground">{r.requesterEmail}</div>
                            </TableCell>
                            <TableCell className="tabular-nums">{formatCurrency(r.amount)}</TableCell>
                            <TableCell>
                              <Badge className={portalHodBadgeClass(r.hodWorkflow)}>{portalHodLabel(r.hodWorkflow)}</Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-muted-foreground">
                              {formatDate(new Date(r.createdAt))}
                            </TableCell>
                            <TableCell className="text-right">
                              {canReleasePortalRequest(user, r.department) &&
                              r.hodWorkflow === 'pending_hod' ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={releaseBusyId === r.id}
                                  onClick={() => void releasePortalRequest(r.id)}
                                >
                                  {releaseBusyId === r.id ? 'Releasing…' : 'Release'}
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
              </div>
            ) : null}

            {showPerDiem && perDiemFiltered.length > 0 ? (
              <div className="space-y-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ref</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Budget</TableHead>
                          <TableHead>Trip / title</TableHead>
                          <TableHead>Requested by</TableHead>
                          <TableHead>Total claim</TableHead>
                          <TableHead>HoD gate</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {perDiemFiltered.map((r) => (
                          <TableRow key={`pd-${r.id}`}>
                            <TableCell className="font-mono tabular-nums">{r.id}</TableCell>
                            <TableCell className="text-sm">{portalDeptLabel(r.department)}</TableCell>
                            <TableCell className="font-mono text-xs">{r.budgetCode}</TableCell>
                            <TableCell className="max-w-[14rem]">
                              <div className="font-medium">{r.title}</div>
                              <div className="truncate text-xs text-muted-foreground">{r.description}</div>
                            </TableCell>
                            <TableCell>
                              <div>{r.requestedBy}</div>
                              <div className="text-xs text-muted-foreground">{r.requesterEmail}</div>
                            </TableCell>
                            <TableCell className="tabular-nums">{formatCurrency(r.amount)}</TableCell>
                            <TableCell>
                              <Badge className={portalHodBadgeClass(r.hodWorkflow)}>{portalHodLabel(r.hodWorkflow)}</Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-muted-foreground">
                              {formatDate(new Date(r.createdAt))}
                            </TableCell>
                            <TableCell className="text-right">
                              {canReleasePortalRequest(user, r.department) &&
                              r.hodWorkflow === 'pending_hod' ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={releaseBusyId === r.id}
                                  onClick={() => void releasePortalRequest(r.id)}
                                >
                                  {releaseBusyId === r.id ? 'Releasing…' : 'Release'}
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
