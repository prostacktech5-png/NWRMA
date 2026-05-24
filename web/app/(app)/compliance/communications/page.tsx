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
import { ComplianceCampaignFormDialog } from '@/components/compliance/compliance-campaign-form-dialog'
import { ComplianceDeptHeader } from '@/components/compliance/compliance-dept-header'
import { useSessionUser } from '@/components/demo-session-provider'
import {
  communicationsThemeLabels,
  type CommunicationsTheme,
  type OutreachCampaignStatus,
} from '@/lib/compliance-mock-data'
import { fetchCampaigns, postJson } from '@/lib/compliance-client'
import { formatDateValue } from '@/lib/erp-formatting'
import type { LroCampaign } from '@/lib/lro-store'

type ThemeTab = 'all' | CommunicationsTheme

function statusClass(status: OutreachCampaignStatus) {
  const map: Record<OutreachCampaignStatus, string> = {
    planned: 'bg-muted text-muted-foreground',
    active: 'bg-primary/10 text-primary',
    completed: 'bg-secondary/10 text-secondary',
  }
  return map[status]
}

export default function ComplianceCommunicationsPage() {
  const { actingUserHeaders } = useSessionUser()
  const [rows, setRows] = useState<LroCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [themeTab, setThemeTab] = useState<ThemeTab>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [actionBusy, setActionBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const campaigns = await fetchCampaigns(actingUserHeaders, {
        theme: themeTab === 'all' ? undefined : themeTab,
        search: search || undefined,
      })
      setRows(campaigns)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }, [actingUserHeaders, themeTab, search])

  useEffect(() => {
    const t = setTimeout(() => void load(), search ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, search])

  async function runAction(id: string, action: 'launch' | 'complete') {
    setActionBusy(id)
    try {
      await postJson(
        `/api/compliance/campaigns/${encodeURIComponent(id)}/actions`,
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
          title="Communications unit"
          subtitle="Corporate communication and public outreach — awareness of NWRMA’s mandate, credible agency image, crisis readiness, and encouragement to regularise with the Agency."
        />
        <Button className="gap-2" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          New campaign
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Tabs value={themeTab} onValueChange={(v) => setThemeTab(v as ThemeTab)}>
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="all">All themes</TabsTrigger>
          <TabsTrigger value="awareness">Awareness</TabsTrigger>
          <TabsTrigger value="image">Agency image</TabsTrigger>
          <TabsTrigger value="regularisation">Regularisation</TabsTrigger>
          <TabsTrigger value="crisis">Crisis</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Campaigns & initiatives</CardTitle>
            <CardDescription>{rows.length} item(s)</CardDescription>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search title, channel…"
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
                  <TableHead>Theme</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{communicationsThemeLabels[c.theme]}</Badge>
                    </TableCell>
                    <TableCell>{c.channel}</TableCell>
                    <TableCell>
                      <Badge className={statusClass(c.status)} variant="secondary">
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDateValue(c.startDate)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={actionBusy === c.id}>
                            {actionBusy === c.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {c.status === 'planned' ? (
                            <DropdownMenuItem onClick={() => void runAction(c.id, 'launch')}>
                              Launch campaign
                            </DropdownMenuItem>
                          ) : null}
                          {c.status === 'active' ? (
                            <DropdownMenuItem onClick={() => void runAction(c.id, 'complete')}>
                              Mark complete
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

      <ComplianceCampaignFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={async (values) => {
          await postJson('/api/compliance/campaigns', actingUserHeaders, values)
          await load()
        }}
      />
    </div>
  )
}
