'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, Loader2, Send, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useSessionUser } from '@/components/demo-session-provider'
import { ERP_DEPARTMENTS, departmentLabel } from '@/lib/org-departments'
import {
  fetchOrgDocuments,
  formatFileSize,
  orgDocumentDownloadUrl,
  uploadOrgDocument,
} from '@/lib/org-documents-client'
import { resolvedApiUrl } from '@/lib/apiBase'
import type { OrgDepartmentDocument } from '@/lib/org-documents-store'
import type { Department } from '@/lib/types'

type ScopeTab = 'all' | 'inbox' | 'sent'

type Props = {
  homeDepartment?: Exclude<Department, null> | null
  pageTitle?: string
}

export function DepartmentDocumentsPage({
  homeDepartment,
  pageTitle = 'Document sharing',
}: Props) {
  const { actingUserHeaders, user } = useSessionUser()
  const senderDept = (user.department ?? homeDepartment) as Exclude<Department, null> | null
  const canSend = Boolean(senderDept)

  const [scope, setScope] = useState<ScopeTab>('all')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<OrgDepartmentDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [toDepartment, setToDepartment] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('general')
  const [file, setFile] = useState<File | null>(null)
  const [sending, setSending] = useState(false)

  const recipientOptions = ERP_DEPARTMENTS.filter((d) => d.value !== senderDept)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const documents = await fetchOrgDocuments(actingUserHeaders, {
        q: search || undefined,
        scope,
        homeDepartment: homeDepartment ?? undefined,
      })
      setRows(documents)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [actingUserHeaders, search, scope, homeDepartment])

  useEffect(() => {
    const t = setTimeout(() => void load(), search ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, search])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!canSend || !senderDept) {
      setError('Assign your account to a department to send files.')
      return
    }
    if (!file || !title.trim() || !toDepartment) {
      setError('Recipient department, title, and file are required.')
      return
    }
    setSending(true)
    setError(null)
    setSuccess(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('title', title.trim())
      fd.append('toDepartment', toDepartment)
      fd.append('description', description.trim())
      fd.append('category', category)
      await uploadOrgDocument(actingUserHeaders, fd)
      setTitle('')
      setDescription('')
      setFile(null)
      setToDepartment('')
      setSuccess('Document sent successfully.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setSending(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this document from the organization library?')) return
    try {
      const res = await fetch(resolvedApiUrl(`/api/org-documents/${encodeURIComponent(id)}`), {
        method: 'DELETE',
        headers: actingUserHeaders,
        credentials: 'same-origin',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Delete failed')
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{pageTitle}</h1>
        <p className="mt-1 text-muted-foreground">
          Search documents shared across NWRMA departments. Send files to another department’s inbox.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="h-5 w-5" />
            Send document
          </CardTitle>
          <CardDescription>
            {canSend
              ? `Sending as ${departmentLabel(senderDept)}`
              : 'Director General and org-wide roles can browse and download; assign a department to send.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canSend ? (
            <form onSubmit={handleSend} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>To department</Label>
                <Select value={toDepartment} onValueChange={setToDepartment} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipient department" />
                  </SelectTrigger>
                  <SelectContent>
                    {recipientOptions.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Description (optional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="policy">Policy</SelectItem>
                    <SelectItem value="report">Report</SelectItem>
                    <SelectItem value="legal">Legal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>File</Label>
                <Input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={sending} className="gap-2">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send to department
                </Button>
              </div>
            </form>
          ) : null}
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {success ? <p className="text-sm text-secondary">{success}</p> : null}

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Shared documents</CardTitle>
            <CardDescription>{rows.length} document(s)</CardDescription>
          </div>
          <Input
            className="max-w-xs"
            placeholder="Search organization…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={scope} onValueChange={(v) => setScope(v as ScopeTab)}>
            <TabsList>
              <TabsTrigger value="all">Organization</TabsTrigger>
              {homeDepartment ? (
                <>
                  <TabsTrigger value="inbox">Inbox</TabsTrigger>
                  <TabsTrigger value="sent">Sent</TabsTrigger>
                </>
              ) : null}
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No documents found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Sent by</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {departmentLabel(d.fromDepartment)} → {departmentLabel(d.toDepartment)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="block text-sm">{d.fileName}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(d.sizeBytes)}
                      </span>
                    </TableCell>
                    <TableCell>{d.uploadedByName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <a href={orgDocumentDownloadUrl(d.id)} download>
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                        {(user.role === 'hod' || user.role === 'admin') &&
                        (d.fromDepartment === senderDept ||
                          d.toDepartment === senderDept ||
                          user.role === 'admin') ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => void handleDelete(d.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
