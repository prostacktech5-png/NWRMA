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
import { useErpReference } from '@/components/reference-data-provider'
import { formatDateValue, licenseApplicationStatusLabels } from '@/lib/erp-formatting'
import type { LicenseApplicationStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

function statusBadgeClass(status: LicenseApplicationStatus): string {
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

export default function LicenseApplicationsPage() {
  const { data } = useErpReference()
  const applications = data.licenseApplications
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return applications
    return applications.filter(
      (app) =>
        app.reference.toLowerCase().includes(q) ||
        app.organisationName.toLowerCase().includes(q) ||
        app.applicantName.toLowerCase().includes(q) ||
        app.applicantEmail.toLowerCase().includes(q)
    )
  }, [applications, searchQuery])

  const pendingCount = applications.filter((a) =>
    ['submitted', 'under_review', 'additional_info_required'].includes(a.status)
  ).length
  const submittedCount = applications.filter((a) => a.status === 'submitted').length
  const approvedCount = applications.filter((a) => a.status === 'approved').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Review drilling licence
          </h1>
          <p className="text-muted-foreground">
            Applications submitted through the public portal
          </p>
        </div>
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
              <span className="text-2xl font-bold">{pendingCount}</span>
              <Clock className="h-5 w-5 text-warning-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">New submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{submittedCount}</span>
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
              <span className="text-2xl font-bold">{approvedCount}</span>
              <CheckCircle2 className="h-5 w-5 text-secondary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Portal submissions</CardTitle>
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
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
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
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No applications match your search.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-mono text-sm font-medium">{app.reference}</TableCell>
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
                        {licenseApplicationStatusLabels[app.status] ?? app.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/boreholes/license-applications/${app.id}`}>Review</Link>
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
