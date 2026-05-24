'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react'
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
import { ComplianceDeptHeader } from '@/components/compliance/compliance-dept-header'
import { ComplianceRegulationFormDialog } from '@/components/compliance/compliance-regulation-form-dialog'
import { useSessionUser } from '@/components/demo-session-provider'
import { fetchRegulations, patchJson, postJson } from '@/lib/compliance-client'
import { resolvedApiUrl } from '@/lib/apiBase'
import type { LroRegulationRef } from '@/lib/lro-store'

type CategoryTab = 'all' | 'Acts' | 'Regulations' | 'Policies'

export default function ComplianceRegulationsPage() {
  const { actingUserHeaders } = useSessionUser()
  const [rows, setRows] = useState<LroRegulationRef[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<CategoryTab>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<LroRegulationRef | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const regulations = await fetchRegulations(
        actingUserHeaders,
        category === 'all' ? undefined : category
      )
      const q = search.trim().toLowerCase()
      setRows(
        q
          ? regulations.filter(
              (r) =>
                r.title.toLowerCase().includes(q) ||
                r.summary.toLowerCase().includes(q) ||
                r.category.toLowerCase().includes(q)
            )
          : regulations
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load regulations')
    } finally {
      setLoading(false)
    }
  }, [actingUserHeaders, category, search])

  useEffect(() => {
    const t = setTimeout(() => void load(), search ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, search])

  async function handleDelete(id: string) {
    if (!confirm('Delete this regulation reference?')) return
    try {
      const res = await fetch(resolvedApiUrl(`/api/compliance/regulations/${encodeURIComponent(id)}`), {
        method: 'DELETE',
        headers: actingUserHeaders,
        credentials: 'same-origin',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(typeof data.error === 'string' ? data.error : 'Delete failed')
      }
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <ComplianceDeptHeader
          title="Regulations library"
          subtitle="Acts, regulations, and policies supporting Legal, Regulations and Outreach and NWRMA’s governance framework."
        />
        <Button
          className="gap-2"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          Add regulation
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Tabs value={category} onValueChange={(v) => setCategory(v as CategoryTab)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="Acts">Acts</TabsTrigger>
          <TabsTrigger value="Regulations">Regulations</TabsTrigger>
          <TabsTrigger value="Policies">Policies</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Reference documents</CardTitle>
            <CardDescription>{rows.length} item(s)</CardDescription>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search title, category…"
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
                  <TableHead>Category</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Badge variant="outline">{r.category}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {r.externalUrl ? (
                        <a
                          href={r.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {r.title}
                        </a>
                      ) : (
                        r.title
                      )}
                    </TableCell>
                    <TableCell className="max-w-md text-muted-foreground">{r.summary}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(r)
                            setFormOpen(true)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => void handleDelete(r.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ComplianceRegulationFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSubmit={async (values) => {
          if (editing) {
            await patchJson(
              `/api/compliance/regulations/${encodeURIComponent(editing.id)}`,
              actingUserHeaders,
              values
            )
          } else {
            await postJson('/api/compliance/regulations', actingUserHeaders, values)
          }
          await load()
        }}
      />
    </div>
  )
}
