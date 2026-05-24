'use client'

import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  Receipt,
  Search,
  XCircle,
} from 'lucide-react'
import { useSessionUser } from '@/components/demo-session-provider'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { resolvedApiUrl } from '@/lib/apiBase'
import type { BankReceiptValidationQueueItem } from '@/lib/bank-receipt-validation-desk'
import {
  bankReceiptValidationStatusLabels,
  formatDateValue,
} from '@/lib/erp-formatting'
import type { BankReceiptValidationStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

type DeskResponse = {
  items: BankReceiptValidationQueueItem[]
  metrics: { pending: number; validated: number; rejected: number; total: number }
}

function validationBadgeClass(status: BankReceiptValidationStatus): string {
  switch (status) {
    case 'validated':
      return 'bg-secondary/10 text-secondary'
    case 'rejected':
      return 'bg-destructive/10 text-destructive'
    default:
      return 'bg-warning/10 text-warning-foreground'
  }
}

function ReceiptValidationDetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-border/70 py-3 last:border-b-0 sm:grid-cols-[8.75rem_minmax(0,1fr)] sm:items-start sm:gap-4">
      <span className="text-sm font-bold leading-snug text-foreground">{label}</span>
      <div className="min-w-0 text-sm leading-snug text-foreground">{value ?? '—'}</div>
    </div>
  )
}

function ReceiptValidationDetailSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-muted/20">
      <h3 className="border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-foreground">
        {title}
      </h3>
      <div className="px-4">{children}</div>
    </section>
  )
}

async function fetchDesk(actingUserHeaders: Record<string, string>): Promise<DeskResponse> {
  const res = await fetch(resolvedApiUrl('/api/finance/bank-receipt-validation'), {
    headers: { ...actingUserHeaders },
    credentials: 'include',
    cache: 'no-store',
  })
  const body = (await res.json().catch(() => ({}))) as DeskResponse & { error?: string }
  if (!res.ok) throw new Error(body.error ?? 'Failed to load validation desk')
  return body
}

export function BankReceiptValidationDeskPage() {
  const { actingUserHeaders, user } = useSessionUser()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [tab, setTab] = useState<'all' | 'pending' | 'validated' | 'rejected'>('pending')
  const [selected, setSelected] = useState<BankReceiptValidationQueueItem | null>(null)
  const [note, setNote] = useState('')
  const [receiptBusyId, setReceiptBusyId] = useState<string | null>(null)
  const [emailWarning, setEmailWarning] = useState<string | null>(null)

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['finance-bank-receipt-desk', user.id],
    queryFn: () => fetchDesk(actingUserHeaders),
    refetchInterval: 45_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  })

  const items = data?.items ?? []
  const metrics = data?.metrics ?? { pending: 0, validated: 0, rejected: 0, total: 0 }

  const filtered = useMemo(() => {
    let rows = items
    if (tab !== 'all') {
      rows = rows.filter((r) => r.validationStatus === tab)
    }
    const q = searchQuery.toLowerCase().trim()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.intakeReference.toLowerCase().includes(q) ||
        r.organisationName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.contactPersonName.toLowerCase().includes(q) ||
        r.formLabel.toLowerCase().includes(q)
    )
  }, [items, searchQuery, tab])

  const validateMutation = useMutation({
    mutationFn: async ({
      item,
      status,
      note: validationNote,
    }: {
      item: BankReceiptValidationQueueItem
      status: 'validated' | 'rejected'
      note: string
    }) => {
      const res = await fetch(
        resolvedApiUrl(`/api/finance/bank-receipt-validation/${item.intakeId}`),
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...actingUserHeaders },
          credentials: 'include',
          body: JSON.stringify({ status, note: validationNote || undefined }),
        }
      )
      const body = (await res.json().catch(() => ({}))) as {
        error?: string
        emailWarning?: string
        receiptNumber?: string | null
      }
      if (!res.ok) throw new Error(body.error ?? 'Update failed')
      return body
    },
    onSuccess: async (body, vars) => {
      setSelected(null)
      setNote('')
      const parts: string[] = []
      if (vars.status === 'validated' && body.receiptNumber) {
        parts.push(`Receipt number ${body.receiptNumber} issued and emailed to the applicant.`)
      }
      if (body.emailWarning) parts.push(body.emailWarning)
      setEmailWarning(parts.length ? parts.join(' ') : null)
      await queryClient.invalidateQueries({ queryKey: ['erp-reference-data'] })
      await refetch()
    },
  })

  const openValidate = (item: BankReceiptValidationQueueItem) => {
    setSelected(item)
    setNote(item.validation.note ?? '')
  }

  const openReceipt = async (row: BankReceiptValidationQueueItem) => {
    const key = row.intakeId
    setReceiptBusyId(key)
    try {
      const res = await fetch(
        resolvedApiUrl(`${row.documentApiPath}?disposition=inline`),
        { headers: { ...actingUserHeaders }, credentials: 'include' }
      )
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Could not open receipt')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not open receipt')
    } finally {
      setReceiptBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      {emailWarning ? (
        <div className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
          {emailWarning}
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Bank Receipt Validation Desk
          </h1>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          {isFetching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Refreshing…
            </>
          ) : (
            'Refresh'
          )}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending validation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{metrics.pending}</span>
              <Clock className="h-5 w-5 text-warning-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Validated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{metrics.validated}</span>
              <CheckCircle2 className="h-5 w-5 text-secondary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{metrics.rejected}</span>
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total receipts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{metrics.total}</span>
              <Receipt className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Receipt queue</CardTitle>
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="validated">Validated</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search reference, organisation, email, form…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {(error as Error).message}
            </p>
          ) : isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading receipts…
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No bank receipts in this view. Submissions appear here after applicants upload a receipt
              on the public online forms.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Form</TableHead>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Receipt status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.intakeId}>
                    <TableCell className="font-medium">{row.intakeReference}</TableCell>
                    <TableCell>{row.formLabel}</TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate" title={row.organisationName}>
                        {row.organisationName}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {row.contactPersonName} · {row.email}
                      </div>
                      <div className="text-xs text-muted-foreground">{row.phone}</div>
                    </TableCell>
                    <TableCell>{formatDateValue(new Date(row.submittedAt))}</TableCell>
                    <TableCell>
                      <Badge className={cn(validationBadgeClass(row.validationStatus))}>
                        {bankReceiptValidationStatusLabels[row.validationStatus] ??
                          row.validationStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={receiptBusyId === row.intakeId}
                          onClick={() => void openReceipt(row)}
                        >
                          {receiptBusyId === row.intakeId ? (
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <FileText className="mr-1 h-3.5 w-3.5" />
                          )}
                          Receipt
                        </Button>
                        {row.reviewHref ? (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={row.reviewHref}>
                              <ExternalLink className="mr-1 h-3.5 w-3.5" />
                              Application
                            </Link>
                          </Button>
                        ) : null}
                        {row.validationStatus === 'pending' ? (
                          <Button size="sm" onClick={() => openValidate(row)}>
                            Review
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

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="flex max-h-[min(90vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="space-y-3 border-b border-border px-6 pb-4 pt-6 text-left">
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
              Validate bank receipt
            </DialogTitle>
            {selected ? (
              <DialogDescription asChild>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono text-sm font-bold">
                    {selected.intakeReference}
                  </Badge>
                  <span className="text-sm font-semibold text-foreground">{selected.formLabel}</span>
                </div>
              </DialogDescription>
            ) : null}
          </DialogHeader>

          {selected ? (
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
              <ReceiptValidationDetailSection title="Applicant">
                <ReceiptValidationDetailRow
                  label="Organisation"
                  value={selected.organisationName}
                />
                <ReceiptValidationDetailRow
                  label="Contact person"
                  value={selected.contactPersonName}
                />
                <ReceiptValidationDetailRow
                  label="Email"
                  value={
                    selected.email ? (
                      <a
                        href={`mailto:${selected.email}`}
                        className="break-all text-primary underline-offset-2 hover:underline"
                      >
                        {selected.email}
                      </a>
                    ) : (
                      '—'
                    )
                  }
                />
                <ReceiptValidationDetailRow label="Phone" value={selected.phone} />
              </ReceiptValidationDetailSection>

              <ReceiptValidationDetailSection title="Receipt">
                {selected.validation.receiptNumber ? (
                  <ReceiptValidationDetailRow
                    label="Official receipt no."
                    value={
                      <span className="font-mono font-semibold">
                        {selected.validation.receiptNumber}
                      </span>
                    }
                  />
                ) : null}
                <ReceiptValidationDetailRow
                  label="File name"
                  value={selected.receiptFile.name}
                />
                <ReceiptValidationDetailRow
                  label="Submitted"
                  value={formatDateValue(new Date(selected.submittedAt))}
                />
                <div className="py-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    disabled={receiptBusyId === selected.intakeId}
                    onClick={() => void openReceipt(selected)}
                  >
                    {receiptBusyId === selected.intakeId ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Opening…
                      </>
                    ) : (
                      <>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View receipt
                      </>
                    )}
                  </Button>
                </div>
              </ReceiptValidationDetailSection>

              <section className="space-y-2">
                <Label htmlFor="validation-note" className="text-sm font-bold text-foreground">
                  Comment
                  {selected.validationStatus === 'pending' ? (
                    <span className="font-normal text-muted-foreground">
                      {' '}
                      (required if rejecting)
                    </span>
                  ) : null}
                </Label>
                <Textarea
                  id="validation-note"
                  rows={3}
                  className="resize-none"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Payment reference, amount verified, or reason for rejection…"
                />
              </section>

              {validateMutation.isError ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                  {(validateMutation.error as Error).message}
                </p>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="flex flex-col gap-2 border-t border-border bg-muted/20 px-6 py-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setSelected(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="w-full sm:w-auto"
              disabled={!selected || validateMutation.isPending || !note.trim()}
              onClick={() =>
                selected &&
                validateMutation.mutate({
                  item: selected,
                  status: 'rejected',
                  note,
                })
              }
            >
              Reject
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={!selected || validateMutation.isPending}
              onClick={() =>
                selected &&
                validateMutation.mutate({
                  item: selected,
                  status: 'validated',
                  note,
                })
              }
            >
              {validateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Mark validated'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
