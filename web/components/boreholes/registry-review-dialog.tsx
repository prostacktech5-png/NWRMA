'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RegistryCompanyReview } from '@/components/boreholes/registry-company-review'
import type { Survey123IntakeSummary } from '@/lib/types'

export function RegistryReviewDialog({
  open,
  onOpenChange,
  pending,
  initialIntakeId,
  actingUserHeaders,
  onQueueChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pending: Survey123IntakeSummary[]
  initialIntakeId?: string | null
  actingUserHeaders: HeadersInit
  onQueueChange?: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(90vh,920px)] max-h-[90vh] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl lg:max-w-7xl">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>Registry</DialogTitle>
          <DialogDescription>
            Select a licensed drilling company to review Survey123 borehole submissions
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-4">
          <RegistryCompanyReview
            variant="dialog"
            pending={pending}
            initialIntakeId={initialIntakeId}
            actingUserHeaders={actingUserHeaders}
            onQueueChange={onQueueChange}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
