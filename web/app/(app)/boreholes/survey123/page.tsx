'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Database, Search, Upload, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useSessionUser } from '@/components/demo-session-provider'
import { invalidateBoreholesDepartmentQueries } from '@/lib/boreholes-department-sync'
import { resolvedApiUrl } from '@/lib/apiBase'
import { formatDateValue } from '@/lib/erp-formatting'
import type { Survey123BoreholeIntake } from '@/lib/types'
import { cn } from '@/lib/utils'

function statusClass(status: string): string {
  switch (status) {
    case 'registered':
      return 'bg-secondary/10 text-secondary'
    case 'rejected':
      return 'bg-destructive/10 text-destructive'
    default:
      return 'bg-primary/10 text-primary'
  }
}

export default function Survey123BoreholeDataPage() {
  const { actingUserHeaders } = useSessionUser()
  const queryClient = useQueryClient()
  const [intakes, setIntakes] = useState<Survey123BoreholeIntake[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [importJson, setImportJson] = useState('')
  const [importing, setImporting] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [seedMessage, setSeedMessage] = useState<string | null>(null)

  const loadIntakes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(resolvedApiUrl('/api/boreholes/survey123-intakes'), {
        headers: { ...actingUserHeaders },
        credentials: 'same-origin',
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as { intakes: Survey123BoreholeIntake[] }
      setIntakes(
        data.intakes.map((i) => ({
          ...i,
          receivedAt: new Date(i.receivedAt),
          createdAt: new Date(i.createdAt),
        }))
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load intakes.')
    } finally {
      setLoading(false)
    }
  }, [actingUserHeaders])

  useEffect(() => {
    void loadIntakes()
  }, [loadIntakes])

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return intakes
    return intakes.filter(
      (i) =>
        (i.drillingCompanyName ?? '').toLowerCase().includes(q) ||
        (i.locationDescription ?? '').toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q)
    )
  }, [intakes, searchQuery])

  async function handleSeedDemo() {
    setSeeding(true)
    setError(null)
    setSeedMessage(null)
    try {
      const res = await fetch(resolvedApiUrl('/api/boreholes/survey123-intakes/seed-demo'), {
        method: 'POST',
        headers: { ...actingUserHeaders },
        credentials: 'same-origin',
      })
      const data = (await res.json()) as { error?: string; created?: number }
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setSeedMessage(`${data.created ?? 0} demo submissions created. Open Borehole Registry to review.`)
      await loadIntakes()
      invalidateBoreholesDepartmentQueries(queryClient)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Demo seed failed.')
    } finally {
      setSeeding(false)
    }
  }

  async function handleImport() {
    setImporting(true)
    setError(null)
    try {
      const raw = JSON.parse(importJson) as Record<string, unknown>
      const res = await fetch(resolvedApiUrl('/api/boreholes/survey123-intakes/import'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...actingUserHeaders },
        credentials: 'same-origin',
        body: JSON.stringify(raw),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      setImportOpen(false)
      setImportJson('')
      await loadIntakes()
      invalidateBoreholesDepartmentQueries(queryClient)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Database className="mt-1 h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              Survey123 Borehole data
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="gap-2" variant="secondary" onClick={() => void handleSeedDemo()} disabled={seeding}>
            <Database className="h-4 w-4" />
            {seeding ? 'Loading demo…' : 'Load demo test data'}
          </Button>
          <Button className="gap-2" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />
            Import JSON
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {seedMessage ? (
        <p className="rounded-md border border-secondary/30 bg-secondary/10 px-3 py-2 text-sm text-secondary">
          {seedMessage}{' '}
          <Link href="/boreholes/registry" className="font-medium underline">
            Go to Registry
          </Link>
        </p>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Submissions</CardTitle>
            <CardDescription>Company, location, coordinates, and drilling parameters</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search submissions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Coordinates</TableHead>
                  <TableHead>Depth (m)</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No submissions yet. Use Import JSON or connect the Survey123 webhook.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>{i.drillingCompanyName ?? '—'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {i.locationDescription ?? '—'}
                      </TableCell>
                      <TableCell>
                        {i.lat != null && i.lng != null ? (
                          <span className="inline-flex items-center gap-1 font-mono text-xs">
                            <MapPin className="h-3 w-3" />
                            {i.lat.toFixed(5)}, {i.lng.toFixed(5)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>{i.boreholeDepthM != null ? `${i.boreholeDepthM}m` : '—'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateValue(i.receivedAt)}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('capitalize', statusClass(i.status))}>
                          {i.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Survey123 JSON</DialogTitle>
            <DialogDescription>
              Paste a Survey123 export or sample payload. Fields are mapped automatically.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            className="min-h-[200px] font-mono text-xs"
            placeholder='{"drillingCompanyName":"Example Drilling Ltd","lat":7.88,"lng":-11.17,...}'
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleImport()} disabled={importing || !importJson.trim()}>
              {importing ? 'Importing...' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
