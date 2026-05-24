'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Eye } from 'lucide-react'
import { departmentNames, formatNLe } from '@/lib/mock-data'
import { StatusBadge } from '@/components/StatusBadge'

export type RequisitionDetailsReq = {
  id: number
  title: string
  requestedBy: string
  department: string
  amount: number
  status: string
  approvalRoute: string
  createdAt: string
  description: string
}

export function RequisitionDetailsDialog({ req }: { req: RequisitionDetailsReq }) {
  const deptLabel = departmentNames[req.department] ?? req.department
  const routeLabel =
    req.approvalRoute === 'petty_cash_direct'
      ? 'Petty cash (HoD → Finance, ≤500 SLE)'
      : req.approvalRoute === 'full_chain'
        ? 'Full chain (HoD → HR & Admin → DG → Finance)'
        : req.approvalRoute === 'petty_cash'
          ? 'Petty cash'
          : req.approvalRoute === 'full' || req.approvalRoute === 'full_approval'
            ? 'Full approval'
            : req.approvalRoute.replace(/_/g, ' ')

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Eye className="h-3.5 w-3.5" />
          Details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-left leading-snug">{req.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">{req.description}</p>
          <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 text-xs">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-bold tabular-nums">{formatNLe(Number(req.amount))}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Requester</span>
              <span className="font-medium">{req.requestedBy}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Department</span>
              <span className="font-medium">{deptLabel}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Route</span>
              <span className="font-medium capitalize">{routeLabel}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Submitted</span>
              <span className="tabular-nums">{new Date(req.createdAt).toLocaleString('en-GB')}</span>
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={req.status} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
