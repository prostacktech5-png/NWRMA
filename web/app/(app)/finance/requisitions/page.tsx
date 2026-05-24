'use client'

import { useState } from 'react'
import {
  Plus,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  formatCurrency,
  formatDate,
  requisitionStatusLabels,
  departmentNames,
} from '@/lib/mock-data'
import { useErpReference } from '@/components/reference-data-provider'
import { FinanceRequisitionSettlementQueue } from '@/components/finance/FinanceRequisitionSettlementQueue'
import { PublicPortalSubmissionsPanel } from '@/components/public-portal/public-portal-submissions-panel'

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    submitted: 'bg-primary/10 text-primary',
    hod_review: 'bg-warning/10 text-warning-foreground',
    admin_review: 'bg-warning/10 text-warning-foreground',
    dg_review: 'bg-warning/10 text-warning-foreground',
    finance_review: 'bg-warning/10 text-warning-foreground',
    approved: 'bg-secondary/10 text-secondary',
    rejected: 'bg-destructive/10 text-destructive',
    paid: 'bg-secondary/10 text-secondary',
  }
  return colors[status] || 'bg-muted text-muted-foreground'
}

export default function FinanceRequisitionsPage() {
  const { data } = useErpReference()
  const requisitions = data.requisitions
  const budgetLines = data.programmeBudgetLines
  const [searchQuery, setSearchQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  const filteredRequisitions = requisitions.filter((req) => {
    const matchesSearch =
      req.requesterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.narrative.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.id.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (activeTab === 'all') return matchesSearch
    if (activeTab === 'pending') {
      return matchesSearch &&
        ['submitted', 'hod_review', 'admin_review', 'dg_review', 'finance_review'].includes(req.status)
    }
    if (activeTab === 'approved') return matchesSearch && req.status === 'approved'
    if (activeTab === 'paid') return matchesSearch && req.status === 'paid'
    return matchesSearch
  })

  const pendingCount = requisitions.filter((r) =>
    ['submitted', 'hod_review', 'admin_review', 'dg_review', 'finance_review'].includes(r.status)
  ).length
  const approvedCount = requisitions.filter(r => r.status === 'approved').length
  const totalValue = requisitions.reduce((sum, r) => sum + r.amount, 0)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Requisitions</h1>
          <p className="text-muted-foreground">
            Manage budget requisitions and approvals
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Requisition
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Requisition</DialogTitle>
              <DialogDescription>
                Submit a new budget requisition for approval.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Programme Budget Line</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select budget line" />
                  </SelectTrigger>
                  <SelectContent>
                    {budgetLines.map((bl) => (
                      <SelectItem key={bl.id} value={bl.id}>
                        {bl.programmeCode} - {bl.programmeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount (SLE)</Label>
                  <Input type="number" placeholder="e.g. 5000000" />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(departmentNames).map(([key, name]) => (
                        <SelectItem key={key} value={key}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description / Narrative</Label>
                <Textarea 
                  placeholder="Describe the purpose of this requisition..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Save as Draft
              </Button>
              <Button onClick={() => setDialogOpen(false)}>Submit for Approval</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <FinanceRequisitionSettlementQueue />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Requisitions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{requisitions.length}</span>
              <FileText className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Approval
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
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{approvedCount}</span>
              <CheckCircle2 className="h-5 w-5 text-secondary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>All Requisitions</CardTitle>
            <CardDescription>Track and manage budget requests</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search requisitions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 sm:w-64"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="paid">Paid</TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab} className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequisitions.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <span className="font-mono font-medium">{req.id.toUpperCase()}</span>
                      </TableCell>
                      <TableCell>{req.requesterName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {req.department ? departmentNames[req.department] : 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(req.amount)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {req.narrative}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(req.status)}>
                          {requisitionStatusLabels[req.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(req.createdAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <FileText className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Add Comment
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <PublicPortalSubmissionsPanel title="Agency public form submissions" />
    </div>
  )
}
