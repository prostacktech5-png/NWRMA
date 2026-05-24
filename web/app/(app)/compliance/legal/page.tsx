'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, MoreHorizontal, Plus, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ComplianceDeptHeader } from '@/components/compliance/compliance-dept-header'
import { ComplianceLegalMatterFormDialog } from '@/components/compliance/compliance-legal-matter-form-dialog'
import { useSessionUser } from '@/components/demo-session-provider'
import { legalMatterTypeLabels, type LegalMatterStatus } from '@/lib/compliance-mock-data'
import { fetchLegalMatters, patchJson, postJson } from '@/lib/compliance-client'
import { formatDateValue } from '@/lib/erp-formatting'
import type { LroLegalMatter } from '@/lib/lro-store'

type LegalTab = 'all' | 'representation' | 'byelaw'

function statusClass(status: LegalMatterStatus) {
  const map: Record<LegalMatterStatus, string> = {
    draft: 'bg-muted text-muted-foreground',
    active: 'bg-primary/10 text-primary',
    archived: 'bg-secondary/10 text-secondary',
  }
  return map[status]
}

export default function ComplianceLegalPage() {
  const { actingUserHeaders } = useSessionUser()
  const [rows, setRows] = useState<LroLegalMatter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<LegalTab>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<LroLegalMatter | null>(null)
  const [actionBusy, setActionBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const matters = await fetchLegalMatters(actingUserHeaders, {
        matterType: tab === 'all' ? undefined : tab,
        search: search || undefined,
      })
      setRows(matters)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load matters')
    } finally {
      setLoading(false)
    }
  }, [actingUserHeaders, tab, search])

  useEffect(() => {
    const t = setTimeout(() => void load(), search ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, search])

  async function runAction(id: string, action: 'activate' | 'archive') {
    setActionBusy(id)
    try {
      await postJson(
        `/api/compliance/legal-matters/${encodeURIComponent(id)}/actions`,
        actingUserHeaders,
        { action }
      )
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
          title="Legal unit"
          subtitle="Legal representation and development of byelaws for the National Water Resources Management Agency."
        />
        <Button
          className="gap-2"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          New matter
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Tabs value={tab} onValueChange={(v) => setTab(v as LegalTab)}>
        <TabsList>
          <TabsTrigger value="all">All matters</TabsTrigger>
          <TabsTrigger value="representation">Legal representation</TabsTrigger>
          <TabsTrigger value="byelaw">Byelaws</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Legal matters</CardTitle>
            <CardDescription>{rows.length} matter(s)</CardDescription>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search title…"
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
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Licence</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{legalMatterTypeLabels[m.matterType]}</Badge>
                    </TableCell>
                    <TableCell>{m.licenseReference ?? '—'}</TableCell>
                    <TableCell>
                      <Badge className={statusClass(m.status)} variant="secondary">
                        {m.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDateValue(m.updatedAt)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={actionBusy === m.id}>
                            {actionBusy === m.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {m.status === 'draft' ? (
                            <>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditing(m)
                                  setFormOpen(true)
                                }}
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => void runAction(m.id, 'activate')}>
                                Activate
                              </DropdownMenuItem>
                            </>
                          ) : null}
                          {m.status !== 'archived' ? (
                            <DropdownMenuItem onClick={() => void runAction(m.id, 'archive')}>
                              Archive
                            </DropdownMenuItem>
                          ) : null}
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

      <ComplianceLegalMatterFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSubmit={async (values) => {
          if (editing) {
            await patchJson(
              `/api/compliance/legal-matters/${encodeURIComponent(editing.id)}`,
              actingUserHeaders,
              values
            )
          } else {
            await postJson('/api/compliance/legal-matters', actingUserHeaders, values)
          }
          await load()
        }}
      />
    </div>
  )
}
