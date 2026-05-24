'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, MoreHorizontal, Search, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { departmentNames, formatDateValue } from '@/lib/erp-formatting'
import { resolvedApiUrl } from '@/lib/apiBase'
import { useSessionUser } from '@/components/demo-session-provider'
import {
  emptyEmployeeForm,
  HrEmployeeFormDialog,
  type HrEmployeeFormSubmit,
  type HrEmployeeFormValues,
} from '@/components/hr/hr-employee-form-dialog'
import { resolveHrEmployeePhotoSrc } from '@/lib/hr-profile-image-client'
import type { Department } from '@/lib/types'

type EmployeeJson = {
  id: string
  employeeNumber: string
  fullName: string
  roleTitle: string
  department: Department
  phone: string
  email: string
  employmentStatus: string
  employmentType: string
  hiredAt: string | null
  dateOfBirth: string | null
  salaryAmount: number | null
  stipendAmount: number | null
  nationalId: string | null
  profileImageUrl: string | null
  emergencyContact: { name: string; phone: string } | null
}

function formToBody(f: HrEmployeeFormValues, skipProfileUrl?: boolean) {
  return {
    fullName: f.fullName,
    roleTitle: f.roleTitle,
    department: f.department,
    employmentType: f.employmentType,
    phone: f.phone,
    email: f.email,
    dateOfBirth: f.dateOfBirth || null,
    employmentStatus: f.employmentStatus,
    salaryAmount: f.salaryAmount ? Number(f.salaryAmount) : null,
    stipendAmount: f.stipendAmount ? Number(f.stipendAmount) : null,
    nationalId: f.nationalId || null,
    profileImageUrl: skipProfileUrl ? undefined : f.profileImageUrl || null,
    hiredAt: f.hiredAt || null,
    emergencyContact:
      f.emergencyName || f.emergencyPhone
        ? { name: f.emergencyName, phone: f.emergencyPhone }
        : null,
  }
}

async function uploadProfileImage(
  employeeId: string,
  file: File,
  headers: HeadersInit
): Promise<void> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(resolvedApiUrl(`/api/hr/employees/${encodeURIComponent(employeeId)}/profile-image`), {
    method: 'POST',
    headers,
    credentials: 'same-origin',
    body: fd,
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(typeof data.error === 'string' ? data.error : 'Profile image upload failed')
  }
}

async function removeProfileImage(employeeId: string, headers: HeadersInit): Promise<void> {
  await fetch(resolvedApiUrl(`/api/hr/employees/${encodeURIComponent(employeeId)}/profile-image`), {
    method: 'DELETE',
    headers,
    credentials: 'same-origin',
  })
}

function employeeToForm(e: EmployeeJson): HrEmployeeFormValues {
  return {
    fullName: e.fullName,
    roleTitle: e.roleTitle,
    department: e.department ?? 'hr',
    employmentType: e.employmentType === 'volunteer' ? 'volunteer' : 'employee',
    phone: e.phone,
    email: e.email,
    dateOfBirth: e.dateOfBirth ?? '',
    employmentStatus:
      e.employmentStatus === 'on_leave' || e.employmentStatus === 'terminated'
        ? e.employmentStatus
        : 'active',
    salaryAmount: e.salaryAmount != null ? String(e.salaryAmount) : '',
    stipendAmount: e.stipendAmount != null ? String(e.stipendAmount) : '',
    nationalId: e.nationalId ?? '',
    profileImageUrl: e.profileImageUrl ?? '',
    hiredAt: e.hiredAt ?? '',
    emergencyName: e.emergencyContact?.name ?? '',
    emergencyPhone: e.emergencyContact?.phone ?? '',
  }
}

export default function HRStaffPage() {
  const { actingUserHeaders } = useSessionUser()
  const [employees, setEmployees] = useState<EmployeeJson[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formInitial, setFormInitial] = useState(emptyEmployeeForm())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const q = searchQuery.trim() ? `?search=${encodeURIComponent(searchQuery.trim())}` : ''
      const res = await fetch(resolvedApiUrl(`/api/hr/employees${q}`), {
        headers: { ...actingUserHeaders },
        credentials: 'same-origin',
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setEmployees((data.employees ?? []) as EmployeeJson[])
      }
    } finally {
      setLoading(false)
    }
  }, [actingUserHeaders, searchQuery])

  useEffect(() => {
    const t = setTimeout(() => void load(), 300)
    return () => clearTimeout(t)
  }, [load])

  const openCreate = () => {
    setEditId(null)
    setFormInitial(emptyEmployeeForm())
    setDialogOpen(true)
  }

  const openEdit = (e: EmployeeJson) => {
    setEditId(e.id)
    setFormInitial(employeeToForm(e))
    setDialogOpen(true)
  }

  const saveEmployee = async (payload: HrEmployeeFormSubmit) => {
    const { values, profileImageFile, removeProfileImage: removePhoto } = payload
    const skipProfile = Boolean(profileImageFile || removePhoto)
    const body = formToBody(values, skipProfile)
    const url = editId
      ? resolvedApiUrl(`/api/hr/employees/${encodeURIComponent(editId)}`)
      : resolvedApiUrl('/api/hr/employees')
    const res = await fetch(url, {
      method: editId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json', ...actingUserHeaders },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(typeof data.error === 'string' ? data.error : 'Save failed')
    }
    const data = await res.json().catch(() => ({}))
    const employeeId =
      editId ?? (typeof data.employee?.id === 'string' ? data.employee.id : null)
    if (employeeId && profileImageFile) {
      await uploadProfileImage(employeeId, profileImageFile, actingUserHeaders)
    } else if (employeeId && removePhoto) {
      await removeProfileImage(employeeId, actingUserHeaders)
    }
    setDialogOpen(false)
    await load()
  }

  const archiveEmployee = async (id: string) => {
    await fetch(resolvedApiUrl(`/api/hr/employees/${encodeURIComponent(id)}`), {
      method: 'DELETE',
      headers: { ...actingUserHeaders },
      credentials: 'same-origin',
    })
    await load()
  }

  const activeCount = employees.filter((e) => e.employmentStatus === 'active').length
  const deptCount = new Set(employees.map((e) => e.department).filter(Boolean)).size

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Staff &amp; Volunteers</h1>
          <p className="text-muted-foreground">Employee profiles synced with leave, assets, and payroll</p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Users className="h-4 w-4" />
          Add employee
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{employees.length}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{activeCount}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Departments</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{deptCount}</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>All employees</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search…"
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : employees.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No employees yet. Add one to begin.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Hired</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          {emp.profileImageUrl ? (
                            <AvatarImage
                              src={resolveHrEmployeePhotoSrc(emp.id, emp.profileImageUrl)}
                              alt=""
                            />
                          ) : null}
                          <AvatarFallback>
                            {emp.fullName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{emp.fullName}</p>
                          <p className="text-sm text-muted-foreground">{emp.roleTitle}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{emp.employeeNumber}</TableCell>
                    <TableCell>
                      {emp.department ? departmentNames[emp.department] ?? emp.department : '—'}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{emp.email}</p>
                      <p className="text-xs text-muted-foreground">{emp.phone}</p>
                    </TableCell>
                    <TableCell>{emp.hiredAt ? formatDateValue(emp.hiredAt) : '—'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{emp.employmentStatus}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(emp)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => void archiveEmployee(emp.id)}
                          >
                            Archive
                          </DropdownMenuItem>
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

      <HrEmployeeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editId ? 'Edit employee' : 'Add employee'}
        initial={formInitial}
        employeeId={editId}
        onSubmit={saveEmployee}
      />
    </div>
  )
}
