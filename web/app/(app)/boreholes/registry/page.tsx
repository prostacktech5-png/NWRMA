'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, MapPin, CheckCircle2, Clock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RegistryReviewDialog } from '@/components/boreholes/registry-review-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDateValue } from '@/lib/erp-formatting'
import { resolvedApiUrl } from '@/lib/apiBase'
import {
  BOREHOLE_REGISTRY_QUEUE_KEY,
  invalidateBoreholesDepartmentQueries,
} from '@/lib/boreholes-department-sync'
import { useSessionUser } from '@/components/demo-session-provider'
import type { Borehole, Survey123IntakeSummary } from '@/lib/types'

function RegistryPageContent() {
  const searchParams = useSearchParams()
  const initialIntakeId = searchParams.get('intakeId')
  const { actingUserHeaders } = useSessionUser()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [registryOpen, setRegistryOpen] = useState(false)

  useEffect(() => {
    if (initialIntakeId) {
      setRegistryOpen(true)
    }
  }, [initialIntakeId])

  const { data, isLoading, refetch } = useQuery({
    queryKey: BOREHOLE_REGISTRY_QUEUE_KEY,
    queryFn: async () => {
      const res = await fetch(resolvedApiUrl('/api/boreholes/registry-queue'), {
        headers: { ...actingUserHeaders },
        credentials: 'same-origin',
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      return (await res.json()) as {
        pending: Survey123IntakeSummary[]
        approved: Borehole[]
      }
    },
  })

  const pending = data?.pending ?? []
  const approved = data?.approved ?? []

  const q = searchQuery.toLowerCase().trim()
  const filteredApproved = useMemo(() => {
    if (!q) return approved
    return approved.filter(
      (bh) =>
        (bh.boreholeId ?? bh.code).toLowerCase().includes(q) ||
        (bh.drillingCompanyName ?? '').toLowerCase().includes(q) ||
        bh.district.toLowerCase().includes(q)
    )
  }, [approved, q])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Borehole Registry</h1>
          <p className="text-muted-foreground">
            Review Survey123 submissions and approve to assign national borehole IDs
          </p>
        </div>
        <Button onClick={() => setRegistryOpen(true)} className="shrink-0 self-start">
          Registry
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{pending.length}</span>
              <Clock className="h-5 w-5 text-warning-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approved boreholes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{approved.length}</span>
              <CheckCircle2 className="h-5 w-5 text-secondary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Districts covered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {new Set(approved.map((b) => b.district)).size}
              </span>
              <MapPin className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {!isLoading ? (
        <RegistryReviewDialog
          open={registryOpen}
          onOpenChange={setRegistryOpen}
          pending={pending}
          initialIntakeId={initialIntakeId}
          actingUserHeaders={actingUserHeaders}
          onQueueChange={() => {
            void refetch()
            invalidateBoreholesDepartmentQueries(queryClient)
          }}
        />
      ) : null}

      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search approved borehole ID or company…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered boreholes</CardTitle>
          <CardDescription>Approved submissions with assigned borehole IDs</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Borehole ID</TableHead>
                <TableHead>Drilling company</TableHead>
                <TableHead>District</TableHead>
                <TableHead>Chiefdom</TableHead>
                <TableHead>Depth (m)</TableHead>
                <TableHead>Registered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApproved.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No approved boreholes yet.
                  </TableCell>
                </TableRow>
              ) : (
                filteredApproved.map((bh) => (
                  <TableRow key={bh.id}>
                    <TableCell>
                      <span className="font-mono font-medium">{bh.boreholeId ?? bh.code}</span>
                    </TableCell>
                    <TableCell>{bh.drillingCompanyName ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {bh.district}
                      </div>
                    </TableCell>
                    <TableCell>{bh.chiefdom ?? '—'}</TableCell>
                    <TableCell>{bh.depthM != null ? `${bh.depthM}m` : '—'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateValue(bh.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default function BoreholeRegistryPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading registry…</p>}>
      <RegistryPageContent />
    </Suspense>
  )
}

