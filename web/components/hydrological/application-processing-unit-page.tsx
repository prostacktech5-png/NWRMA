'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ClipboardCheck, Clock, Search, CheckCircle2 } from 'lucide-react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useErpReference } from '@/components/reference-data-provider'
import {
  buildHydrologicalApuQueue,
  apuQueueMetrics,
  ONLINE_FORM_SLUGS,
  type ApuQueueItem,
  type OnlineFormSlug,
} from '@/lib/hydrological-application-processing'
import { getOnlineForm } from '@/lib/nwrma-site/online-forms/registry'
import { formatDateValue } from '@/lib/erp-formatting'
import { cn } from '@/lib/utils'

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'approved':
      return 'bg-secondary/10 text-secondary'
    case 'rejected':
      return 'bg-destructive/10 text-destructive'
    case 'under_review':
      return 'bg-primary/10 text-primary'
    case 'additional_info_required':
      return 'bg-warning/10 text-warning-foreground'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export function ApplicationProcessingUnitPage() {
  const { data } = useErpReference()
  const applications = useMemo(() => buildHydrologicalApuQueue(data), [data])
  const metrics = useMemo(() => apuQueueMetrics(applications), [applications])
  const [searchQuery, setSearchQuery] = useState('')
  const [formFilter, setFormFilter] = useState<'all' | OnlineFormSlug>('all')

  const filtered = useMemo(() => {
    let list: ApuQueueItem[] = applications
    if (formFilter !== 'all') {
      list = list.filter((a) => a.formSlug === formFilter)
    }
    const q = searchQuery.toLowerCase().trim()
    if (!q) return list
    return list.filter(
      (app) =>
        app.reference.toLowerCase().includes(q) ||
        app.organisationName.toLowerCase().includes(q) ||
        app.applicantName.toLowerCase().includes(q) ||
        app.applicantEmail.toLowerCase().includes(q) ||
        (app.intakeReference?.toLowerCase().includes(q) ?? false) ||
        app.formLabel.toLowerCase().includes(q)
    )
  }, [applications, formFilter, searchQuery])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Hydrological Services Department
        </p>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Application processing unit
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Online permit applications appear here after Finance validates the bank receipt and the
          applicant completes and submits the form.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Awaiting action
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
            <CardTitle className="text-sm font-medium text-muted-foreground">
              New submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{metrics.submitted}</span>
              <ClipboardCheck className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{metrics.approved}</span>
              <CheckCircle2 className="h-5 w-5 text-secondary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Portal submissions</CardTitle>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Select
                value={formFilter}
                onValueChange={(v) => setFormFilter(v as 'all' | OnlineFormSlug)}
              >
                <SelectTrigger className="w-full sm:w-[240px]">
                  <SelectValue placeholder="All forms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All forms</SelectItem>
                  {ONLINE_FORM_SLUGS.map((slug) => (
                    <SelectItem key={slug} value={slug}>
                      {getOnlineForm(slug)?.title ?? slug}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search reference, company, applicant…"
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Form</TableHead>
                <TableHead>Payment intake</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Applicant</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    {applications.length === 0
                      ? 'No completed online applications yet. Submissions appear here after Finance validates the receipt and the applicant submits the form.'
                      : 'No applications match your search.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((app) => (
                  <TableRow key={`${app.formSlug}-${app.id}`}>
                    <TableCell className="font-mono text-sm font-medium">{app.reference}</TableCell>
                    <TableCell className="max-w-[180px] text-sm">{app.formLabel}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {app.intakeReference ?? '—'}
                    </TableCell>
                    <TableCell>{app.organisationName}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{app.applicantName}</p>
                        <p className="text-xs text-muted-foreground">{app.applicantEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>{formatDateValue(app.submittedAt)}</TableCell>
                    <TableCell>
                      <Badge className={cn('font-normal', statusBadgeClass(app.status))}>
                        {app.statusLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={app.reviewHref}>Review</Link>
                      </Button>
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
