'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Search,
  Filter,
  Download,
  FlaskConical,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  Eye,
  Beaker,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { formatDate, labRequestStatusLabels } from '@/lib/erp-formatting'
import { DEMO_WATER_TESTING_NOTIFY_EMAIL } from '@/lib/seed-water-testing-demo'
import { useSessionUser } from '@/components/demo-session-provider'
import { reviveIsoDatesDeep } from '@/lib/erp-reference-serialize'
import type { LabRequest } from '@/lib/types'
import { WaterTestingInProgressDialog } from '@/components/hydro/water-testing-in-progress-dialog'
import { WaterTestingReportDialog } from '@/components/hydro/water-testing-report-dialog'

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    received: 'bg-primary/10 text-primary',
    in_progress: 'bg-warning/10 text-warning-foreground',
    assigned: 'bg-primary/10 text-primary',
    testing: 'bg-warning/10 text-warning-foreground',
    review: 'bg-warning/10 text-warning-foreground',
    completed: 'bg-secondary/10 text-secondary',
    released: 'bg-secondary/10 text-secondary',
  }
  return colors[status] || 'bg-muted text-muted-foreground'
}

function getPriorityColor(priority: string) {
  const colors: Record<string, string> = {
    normal: 'bg-muted text-muted-foreground',
    urgent: 'bg-warning/10 text-warning-foreground',
    critical: 'bg-destructive/10 text-destructive',
  }
  return colors[priority] || 'bg-muted text-muted-foreground'
}

type Props = {
  pageTitle?: string
}

type DialogState =
  | { kind: 'in_progress'; request: LabRequest }
  | { kind: 'report'; request: LabRequest; readOnly: boolean }
  | null

export function HydrologicalLabQueuePanel({ pageTitle = 'Water testing' }: Props) {
  const { actingUserHeaders } = useSessionUser()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [dialog, setDialog] = useState<DialogState>(null)
  const [seeding, setSeeding] = useState(false)

  const { data: labRequests = [], isLoading, isError, error } = useQuery({
    queryKey: ['water-testing-requests'],
    queryFn: async () => {
      const res = await fetch('/api/hydrological/water-testing/requests', {
        headers: { ...actingUserHeaders },
        credentials: 'same-origin',
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const json = (await res.json()) as { items?: unknown }
      return reviveIsoDatesDeep(json.items ?? []) as LabRequest[]
    },
    staleTime: 30_000,
  })

  const filteredRequests = useMemo(
    () =>
      labRequests.filter(
        (req) =>
          req.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
          req.requesterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          req.organisation.toLowerCase().includes(searchQuery.toLowerCase()) ||
          req.requesterEmail.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [labRequests, searchQuery],
  )

  const pendingCount = labRequests.filter((r) =>
    ['received', 'in_progress', 'assigned', 'testing', 'review'].includes(r.status),
  ).length
  const criticalCount = labRequests.filter((r) => r.priority === 'critical').length

  function refreshList() {
    void queryClient.invalidateQueries({ queryKey: ['water-testing-requests'] })
  }

  async function handleSeedDemo() {
    setSeeding(true)
    try {
      const res = await fetch('/api/hydrological/water-testing/requests/seed-demo', {
        method: 'POST',
        headers: { ...actingUserHeaders },
        credentials: 'same-origin',
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        created?: number
        deleted?: number
        emailWarnings?: string[]
      }
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Could not load demo submissions.')
        return
      }
      const created = data.created ?? 0
      const deleted = data.deleted ?? 0
      if (created > 0) {
        const emailNote =
          created === 4
            ? ` Four “request received” emails were sent to ${DEMO_WATER_TESTING_NOTIFY_EMAIL} (if SMTP is configured).`
            : ''
        toast.success(
          `Recreated ${created} demo submission${created === 1 ? '' : 's'} as Received${deleted > 0 ? ` (replaced ${deleted} previous demo row${deleted === 1 ? '' : 's'})` : ''}.${emailNote}`,
        )
      } else {
        toast.info('No demo submissions were added.')
      }
      const warnings = data.emailWarnings ?? []
      if (warnings.length > 0) {
        toast.warning(warnings.join(' '))
      }
      refreshList()
    } catch {
      toast.error('Network error while loading demo submissions.')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{pageTitle}</h1>
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0 gap-2"
          disabled={seeding}
          onClick={() => void handleSeedDemo()}
        >
          <Beaker className="h-4 w-4" />
          {seeding ? 'Adding…' : 'Add demo submissions'}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{labRequests.length}</span>
              <FlaskConical className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{pendingCount}</span>
              <Clock className="h-5 w-5 text-warning-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {labRequests.filter((r) => r.status === 'completed').length}
              </span>
              <CheckCircle2 className="h-5 w-5 text-secondary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Critical Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{criticalCount}</span>
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>All Requests</CardTitle>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 sm:w-64"
              />
            </div>
            <Button variant="outline" size="icon" type="button" onClick={() => refreshList()}>
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" type="button" disabled>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading requests…</p>
          )}
          {isError && (
            <p className="text-sm text-destructive py-8 text-center">
              {error instanceof Error ? error.message : 'Could not load requests.'}
            </p>
          )}
          {!isLoading && !isError && filteredRequests.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No water testing requests yet. External sites can submit via the public API.
            </p>
          )}
          {!isLoading && !isError && filteredRequests.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Tests</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <span className="font-mono font-medium">{req.reference}</span>
                    </TableCell>
                    <TableCell>
                      <div>{req.requesterName}</div>
                      <div className="text-xs text-muted-foreground">{req.requesterEmail}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{req.organisation}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {req.testsRequested.slice(0, 2).map((test) => (
                          <Badge key={test} variant="outline" className="text-xs">
                            {test}
                          </Badge>
                        ))}
                        {req.testsRequested.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{req.testsRequested.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(req.priority)}>{req.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(req.status)}>
                        {labRequestStatusLabels[req.status] ?? req.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {req.assignedToName ? (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {req.assignedToName}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(req.receivedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 flex-wrap">
                        {req.status === 'received' && (
                          <Button
                            size="sm"
                            onClick={() => setDialog({ kind: 'in_progress', request: req })}
                          >
                            In progress
                          </Button>
                        )}
                        {req.status === 'in_progress' && (
                          <Button
                            size="sm"
                            onClick={() =>
                              setDialog({ kind: 'report', request: req, readOnly: false })
                            }
                          >
                            Report
                          </Button>
                        )}
                        {req.status === 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() =>
                              setDialog({ kind: 'report', request: req, readOnly: true })
                            }
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View report
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {dialog?.kind === 'in_progress' && (
        <WaterTestingInProgressDialog
          open
          onOpenChange={(open) => !open && setDialog(null)}
          request={dialog.request}
          actingUserHeaders={actingUserHeaders}
          onSuccess={refreshList}
        />
      )}
      {dialog?.kind === 'report' && (
        <WaterTestingReportDialog
          open
          onOpenChange={(open) => !open && setDialog(null)}
          request={dialog.request}
          readOnly={dialog.readOnly}
          actingUserHeaders={actingUserHeaders}
          onSuccess={refreshList}
        />
      )}
    </div>
  )
}
