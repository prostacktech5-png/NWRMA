'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Loader2, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { resolvedApiUrl } from '@/lib/apiBase'
import {
  formatAuditTimestampDisplay,
  formatDisplayIp,
  type AuditLogEntry,
} from '@/lib/super-admin/audit-log-shared'

const PAGE_SIZE = 25

function defaultFromDate(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function AuditSecurityLog() {
  const [items, setItems] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)

  const [from, setFrom] = useState(defaultFromDate)
  const [to, setTo] = useState(todayDate)
  const [actor, setActor] = useState('')
  const [eventType, setEventType] = useState('all')
  const [q, setQ] = useState('')

  const page = Math.floor(offset / PAGE_SIZE) + 1
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const filterParams = useMemo(() => {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (actor.trim()) params.set('actor', actor.trim())
    if (eventType !== 'all') params.set('action', eventType)
    if (q.trim()) params.set('q', q.trim())
    return params
  }, [from, to, actor, eventType, q])

  const queryString = useMemo(() => {
    const params = new URLSearchParams(filterParams)
    params.set('limit', String(PAGE_SIZE))
    params.set('offset', String(offset))
    return params.toString()
  }, [filterParams, offset])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(resolvedApiUrl(`/api/super-admin/audit?${queryString}`), {
        credentials: 'include',
      })
      const data = (await res.json().catch(() => null)) as {
        items?: AuditLogEntry[]
        total?: number
        error?: string
      } | null
      if (!res.ok) {
        throw new Error(data?.error ?? `Failed to load (${res.status})`)
      }
      setItems(Array.isArray(data?.items) ? data.items : [])
      setTotal(typeof data?.total === 'number' ? data.total : 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed')
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [queryString])

  useEffect(() => {
    void fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    const interval = setInterval(() => {
      void fetchLogs()
    }, 30_000)
    return () => clearInterval(interval)
  }, [fetchLogs])

  const applyFilters = () => {
    setOffset(0)
    void fetchLogs()
  }

  const downloadCsv = async () => {
    setDownloading(true)
    setError(null)
    try {
      const params = new URLSearchParams(filterParams)
      params.set('export', 'csv')
      params.set('limit', '10000')
      const res = await fetch(resolvedApiUrl(`/api/super-admin/audit?${params.toString()}`), {
        credentials: 'include',
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Download failed (${res.status})`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `audit-security-log-${from || 'start'}-to-${to || 'end'}.csv`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Audit & security log</h2>
          <p className="text-sm text-muted-foreground">
            Comprehensive history of platform actions and authentication events. Refreshes every
            30 seconds.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void downloadCsv()}
            disabled={loading || downloading}
          >
            {downloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => void fetchLogs()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div>
            <CardTitle>System audit log</CardTitle>
            <CardDescription>{total} record(s)</CardDescription>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">From</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="grid min-w-[200px] flex-1 gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Actor</label>
              <Input
                placeholder="Filter by actor (email)"
                value={actor}
                onChange={(e) => setActor(e.target.value)}
              />
            </div>
            <div className="grid min-w-[180px] gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Event type</label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All events</SelectItem>
                  <SelectItem value="auth.">Authentication</SelectItem>
                  <SelectItem value="user.">Users</SelectItem>
                  <SelectItem value="role.">Roles</SelectItem>
                  <SelectItem value="system.">System</SelectItem>
                  <SelectItem value="backup.">Backup</SelectItem>
                  <SelectItem value="borehole.">Boreholes</SelectItem>
                  <SelectItem value="session.">Sessions</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid min-w-[200px] flex-1 gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search logs…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applyFilters()
                  }}
                />
              </div>
            </div>
            <Button type="button" onClick={applyFilters} disabled={loading}>
              Apply filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <>
              <div className="-mx-1 overflow-x-auto">
                <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Timestamp</TableHead>
                    <TableHead className="min-w-[140px]">Actor</TableHead>
                    <TableHead className="whitespace-nowrap">Action</TableHead>
                    <TableHead className="min-w-[220px]">Event</TableHead>
                    <TableHead className="whitespace-nowrap">IP address</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatAuditTimestampDisplay(row.timestamp)}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{row.actorDisplay}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide">
                          {row.actionCategory}
                        </TableCell>
                        <TableCell className="max-w-md whitespace-normal break-words text-sm">
                          {row.event}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-xs">
                          {formatDisplayIp(row.ip) ?? '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={row.status === 'success' ? 'default' : 'destructive'}
                            className={
                              row.status === 'success'
                                ? 'bg-emerald-600 hover:bg-emerald-600'
                                : undefined
                            }
                          >
                            {row.status === 'success' ? 'Success' : 'Failed'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={offset <= 0 || loading}
                    onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={offset + PAGE_SIZE >= total || loading}
                    onClick={() => setOffset((o) => o + PAGE_SIZE)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
