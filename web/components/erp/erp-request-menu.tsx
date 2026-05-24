'use client'

import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FilePlus, Plane, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useDemoSession } from '@/components/demo-session-provider'
import { HydrologicalPublicPerDiemForm } from '@/components/hydro/hydrological-public-per-diem-form'
import { HydrologicalPublicRequisitionForm } from '@/components/hydro/hydrological-public-requisition-form'
import { prefetchErpPortalForm } from '@/hooks/use-erp-portal-form'
import { toCanonicalDept, type CanonicalDept } from '@/lib/orgDepartments'

type RequestKind = 'staff' | 'per_diem' | null

export function ErpRequestMenu() {
  const { user } = useDemoSession()
  const queryClient = useQueryClient()
  const [openKind, setOpenKind] = useState<RequestKind>(null)
  const [formSessionKey, setFormSessionKey] = useState(0)

  const actingUserHeaders = useMemo((): Record<string, string> => {
    const id = user?.id?.trim()
    return id ? { 'X-Acting-User-Id': id } : {}
  }, [user?.id])

  const sessionPrefill = useMemo(() => {
    if (!user) return undefined
    const dept =
      user.department && toCanonicalDept(user.department) ?
        (user.department as CanonicalDept)
      : null
    return {
      name: user.name.trim(),
      email: user.email.trim().toLowerCase(),
      department: dept,
      lockDepartment: user.role === 'staff' || user.role === 'hod',
    }
  }, [user])

  function prefetchForm() {
    if (!actingUserHeaders['X-Acting-User-Id']) return
    void prefetchErpPortalForm(queryClient, actingUserHeaders)
  }

  function openSheet(kind: RequestKind) {
    prefetchForm()
    setFormSessionKey((k) => k + 1)
    setOpenKind(kind)
  }

  function closeSheet() {
    setOpenKind(null)
  }

  const canShowForm = Boolean(user)

  const sheetContentClass =
    'flex w-full flex-col gap-0 overflow-y-auto p-4 pt-12 pb-8 sm:max-w-2xl'

  return (
    <>
      <DropdownMenu onOpenChange={(open) => open && prefetchForm()}>
        <DropdownMenuTrigger asChild>
          <Button variant="default" size="sm" className="gap-2">
            <FilePlus className="h-4 w-4" />
            <span className="hidden sm:inline">Request</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => openSheet('staff')}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Procurement / petty cash
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openSheet('per_diem')}>
            <Plane className="mr-2 h-4 w-4" />
            Per-diem
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={openKind === 'staff'} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent side="right" className={sheetContentClass}>
          <SheetTitle className="sr-only">Procurement / petty cash</SheetTitle>
          {canShowForm && openKind === 'staff' ? (
            <HydrologicalPublicRequisitionForm
              key={`staff-${formSessionKey}`}
              mode="erp"
              actingUserHeaders={actingUserHeaders}
              sessionPrefill={sessionPrefill}
              enabled
              embedded
              onSuccess={closeSheet}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet open={openKind === 'per_diem'} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent side="right" className={sheetContentClass}>
          <SheetTitle className="sr-only">Per-diem request</SheetTitle>
          {canShowForm && openKind === 'per_diem' ? (
            <HydrologicalPublicPerDiemForm
              key={`per-diem-${formSessionKey}`}
              mode="erp"
              actingUserHeaders={actingUserHeaders}
              sessionPrefill={sessionPrefill}
              enabled
              embedded
              onSuccess={closeSheet}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  )
}
