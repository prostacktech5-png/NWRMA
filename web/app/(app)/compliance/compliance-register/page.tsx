'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, MoreHorizontal, Plus, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ComplianceCaseFormDialog } from '@/components/compliance/compliance-case-form-dialog'
import { ComplianceDeptHeader } from '@/components/compliance/compliance-dept-header'
import { useSessionUser } from '@/components/demo-session-provider'
import { useErpReference } from '@/components/reference-data-provider'
import {
  complianceCaseStatusLabels,
  enforcementStageLabels,
  type ComplianceCaseStatus,
} from '@/lib/compliance-mock-data'
import { fetchComplianceCases, patchJson, postJson } from '@/lib/compliance-client'
import { formatDateValue } from '@/lib/erp-formatting'
import type { EnforcementStage, LroComplianceCase } from '@/lib/lro-store'

function statusClass(status: ComplianceCaseStatus) {
  const map: Record<ComplianceCaseStatus, string> = {
    open: 'bg-primary/10 text-primary',
    in_review: 'bg-warning/10 text-warning-foreground',
    resolved: 'bg-secondary/10 text-secondary',
    escalated: 'bg-destructive/10 text-destructive',
  }
  return map[status]
}

export default function ComplianceRegisterPage() {
  const { actingUserHeaders } = useSessionUser()
  const { data: erp } = useErpReference()
  const [rows, setRows] = useState<LroComplianceCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<LroComplianceCase | null>(null)
  const [actionBusy, setActionBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const cases = await fetchComplianceCases(actingUserHeaders, search || undefined)
      setRows(cases)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load cases')
    } finally {
      setLoading(false)
    }
  }, [actingUserHeaders, search])

  useEffect(() => {
    const t = setTimeout(() => void load(), search ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, search])

  const licenseIdByRef = useMemo(() => {
    const m = new Map<string, string>()
    for (const app of erp.licenseApplications) {
      m.set(app.reference, app.id)
    }
    return m
  }, [erp.licenseApplications])

  async function runAction(caseId: string, body: unknown) {
    setActionBusy(caseId)
    try {
      await postJson(`/api/compliance/cases/${encodeURIComponent(caseId)}/actions`, actingUserHeaders, body)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setActionBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <ComplianceDeptHeader
          unit="Specialised unit"
          title="Compliance unit"
          subtitle="Compliance strategic planning and work execution — ensuring public compliance with NWRMA law and encouraging regularisation with the Agency."
        />
        <Button
          className="shrink-0 gap-2"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          New case
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Planning & register</CardTitle>
            <CardDescription>{rows.length} record(s)</CardDescription>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search reference, entity…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No compliance cases yet.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setEditing(null)
                  setFormOpen(true)
                }}
              >
                Create first case
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Licence</TableHead>
                  <TableHead>Workstream</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enforcement</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.reference}</TableCell>
                    <TableCell>{c.entityName}</TableCell>
                    <TableCell>
                      {c.licenseReference ? (
                        licenseIdByRef.get(c.licenseReference) ? (
                          <Link
                            href={`/boreholes/license-applications/${licenseIdByRef.get(c.licenseReference)}`}
                            className="text-primary hover:underline"
                          >
                            {c.licenseReference}
                          </Link>
                        ) : (
                          <Badge variant="outline">{c.licenseReference}</Badge>
                        )
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>{c.workstream}</TableCell>
                    <TableCell>
                      <Badge className={statusClass(c.status)} variant="secondary">
                        {complianceCaseStatusLabels[c.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {c.enforcementStage !== 'none'
                        ? enforcementStageLabels[c.enforcementStage]
                        : '—'}
                    </TableCell>
                    <TableCell>{formatDateValue(c.dueDate)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={actionBusy === c.id}
                          >
                            {actionBusy === c.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(c)
                              setFormOpen(true)
                            }}
                          >
                            Edit details
                          </DropdownMenuItem>
                          {c.status === 'open' ? (
                            <DropdownMenuItem onClick={() => void runAction(c.id, { action: 'start_review' })}>
                              Start review
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem onClick={() => void runAction(c.id, { action: 'resolve' })}>
                            Mark resolved
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void runAction(c.id, { action: 'escalate' })}>
                            Escalate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Enforcement stage</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {(
                                [
                                  'none',
                                  'notice',
                                  'compliance_order',
                                  'admin_penalty',
                                  'prosecution',
                                ] as EnforcementStage[]
                              ).map((stage) => (
                                <DropdownMenuItem
                                  key={stage}
                                  onClick={() =>
                                    void runAction(c.id, {
                                      action: 'set_enforcement',
                                      enforcementStage: stage,
                                    })
                                  }
                                >
                                  {enforcementStageLabels[stage]}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ComplianceCaseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSubmit={async (values) => {
          if (editing) {
            await patchJson(
              `/api/compliance/cases/${encodeURIComponent(editing.id)}`,
              actingUserHeaders,
              values
            )
          } else {
            await postJson('/api/compliance/cases', actingUserHeaders, values)
          }
          await load()
        }}
      />
    </div>
  )
}
