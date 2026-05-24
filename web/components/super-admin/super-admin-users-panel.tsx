'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { resolvedApiUrl } from '@/lib/apiBase'
import { JOB_TITLES, jobTitleLabel, type AdminUserStatus } from '@/lib/job-titles'
import {
  departmentLabel,
  erpRoleLabel,
  ERP_DEPARTMENTS,
  ERP_ROLES,
  type ErpRoleValue,
} from '@/lib/org-departments'

type AdminUser = {
  id: string
  email: string
  name: string
  jobTitle: string | null
  role: string
  department: string | null
  status: string
  platformRoles: string[]
}

const EMPTY_FORM = {
  email: '',
  fullName: '',
  jobTitle: JOB_TITLES[0]?.value ?? '',
  role: 'staff' as ErpRoleValue,
  department: 'hydrological' as string,
}

type SuperAdminUsersPanelProps = {
  showPageTitle?: boolean
}

function normalizeStatus(status: string): AdminUserStatus {
  return status === 'disabled' ? 'disabled' : 'active'
}

function mapApiUser(raw: Record<string, unknown>): AdminUser {
  return {
    id: String(raw.id),
    email: String(raw.email ?? ''),
    name: String(raw.name ?? ''),
    jobTitle: raw.jobTitle != null ? String(raw.jobTitle) : null,
    role: String(raw.role ?? 'staff'),
    department: raw.department != null ? String(raw.department) : null,
    status: String(raw.status ?? 'active'),
    platformRoles: Array.isArray(raw.platformRoles)
      ? raw.platformRoles.filter((x): x is string => typeof x === 'string')
      : [],
  }
}

export function SuperAdminUsersPanel({ showPageTitle = true }: SuperAdminUsersPanelProps) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [rowError, setRowError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null)

  const departmentRequired = form.role === 'hod' || form.role === 'staff'
  const showDepartment = form.role === 'hod' || form.role === 'staff'

  const load = useCallback(async (options?: { refresh?: boolean }) => {
    const isRefresh = options?.refresh === true
    if (isRefresh) setRefreshing(true)
    else setInitialLoading(true)
    try {
      const uRes = await fetch(resolvedApiUrl('/api/super-admin/users'), {
        credentials: 'include',
      })
      if (uRes.ok) {
        const uData = await uRes.json()
        const items = (uData.items ?? []) as Record<string, unknown>[]
        setUsers(items.map(mapApiUser))
      }
    } finally {
      if (isRefresh) setRefreshing(false)
      else setInitialLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const createUser = async () => {
    if (!form.jobTitle) {
      setCreateError('Job title is required.')
      return
    }
    setCreateError(null)
    setCreateSuccess(null)
    setCreating(true)
    try {
      const res = await fetch(resolvedApiUrl('/api/super-admin/users'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          fullName: form.fullName,
          jobTitle: form.jobTitle,
          role: form.role,
          department: showDepartment ? form.department : null,
        }),
      })
      const data = (await res.json()) as Record<string, unknown> & {
        error?: string
        message?: string
        invitationEmailDispatched?: boolean
        smtpConfigured?: boolean
        inviteUrl?: string
        email?: string
      }
      if (!res.ok) {
        if (data.inviteUrl && res.status === 502 && data.id) {
          setUsers((prev) => [...prev, mapApiUser(data)])
          setCreateOpen(false)
          setForm(EMPTY_FORM)
          setCreateError(
            `${data.error ?? 'Email could not be sent.'} Share this link manually: ${data.inviteUrl}`,
          )
          return
        }
        setCreateError(data.error ?? 'Could not create user.')
        return
      }
      setUsers((prev) => [...prev, mapApiUser(data)])
      setCreateOpen(false)
      setForm(EMPTY_FORM)
      if (data.invitationEmailDispatched) {
        setCreateSuccess(
          data.message ??
            `Invitation email sent to ${String(data.email ?? form.email)}. Assign a platform role under RBAC.`,
        )
      } else if (data.smtpConfigured === false && data.inviteUrl) {
        setCreateSuccess(
          `User created. SMTP is not configured — share this set-password link: ${data.inviteUrl}. Assign platform role under RBAC.`,
        )
      } else {
        setCreateSuccess(
          (data.message ?? 'User created.') + ' Assign a platform role under RBAC.',
        )
      }
    } catch {
      setCreateError('Network error. Try again.')
    } finally {
      setCreating(false)
    }
  }

  const updateUserStatus = async (userId: string, status: AdminUserStatus) => {
    setRowError(null)
    setStatusUpdatingId(userId)
    try {
      const res = await fetch(resolvedApiUrl(`/api/super-admin/users/${userId}`), {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = (await res.json()) as { error?: string; status?: string }
      if (!res.ok) {
        setRowError(data.error ?? 'Could not update status.')
        return
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: data.status ?? status } : u)),
      )
    } catch {
      setRowError('Network error. Try again.')
    } finally {
      setStatusUpdatingId(null)
    }
  }

  const deleteUser = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setRowError(null)
    try {
      const res = await fetch(resolvedApiUrl(`/api/super-admin/users/${deleteTarget.id}`), {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setRowError(data.error ?? 'Could not delete user.')
        return
      }
      const deletedId = deleteTarget.id
      setDeleteTarget(null)
      setUsers((prev) => prev.filter((u) => u.id !== deletedId))
    } catch {
      setRowError('Network error. Try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {createSuccess ? (
        <Alert>
          <AlertDescription>{createSuccess}</AlertDescription>
        </Alert>
      ) : null}
      {rowError ? (
        <Alert variant="destructive">
          <AlertDescription>{rowError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
          {showPageTitle ? (
            <h3 className="text-lg font-semibold">User</h3>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void load({ refresh: true })}
              disabled={initialLoading || refreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog
              open={createOpen}
              onOpenChange={(open) => {
                setCreateOpen(open)
                if (!open) {
                  setCreateError(null)
                  setForm(EMPTY_FORM)
                }
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add user
                </Button>
              </DialogTrigger>
              <DialogContent className="flex max-h-[min(90vh,100dvh)] flex-col gap-4 overflow-x-hidden sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create platform user</DialogTitle>
                </DialogHeader>
                <div className="grid min-w-0 gap-3 overflow-y-auto sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="su-fullName">Full name</Label>
                    <Input
                      id="su-fullName"
                      value={form.fullName}
                      onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                      autoComplete="name"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="su-email">Email</Label>
                    <Input
                      id="su-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Job title *</Label>
                    <Select
                      value={form.jobTitle}
                      onValueChange={(v) => setForm((f) => ({ ...f, jobTitle: v }))}
                    >
                      <SelectTrigger className="w-full min-w-0">
                        <SelectValue placeholder="Select job title" />
                      </SelectTrigger>
                      <SelectContent>
                        {JOB_TITLES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>ERP role</Label>
                    <Select
                      value={form.role}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, role: v as ErpRoleValue }))
                      }
                    >
                      <SelectTrigger className="w-full min-w-0">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {ERP_ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {showDepartment ? (
                    <div className="space-y-2">
                      <Label>
                        Department
                        {departmentRequired ? ' *' : ''}
                      </Label>
                      <Select
                        value={form.department}
                        onValueChange={(v) => setForm((f) => ({ ...f, department: v }))}
                      >
                        <SelectTrigger className="w-full min-w-0">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {ERP_DEPARTMENTS.map((d) => (
                            <SelectItem key={d.value} value={d.value}>
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="hidden sm:block" />
                  )}
                  <p className="text-sm text-muted-foreground sm:col-span-2">
                    An email will be sent with a link to set their password. Assign platform
                    permissions under Settings → RBAC.
                  </p>
                </div>
                {createError ? (
                  <Alert variant="destructive">
                    <AlertDescription>{createError}</AlertDescription>
                  </Alert>
                ) : null}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => void createUser()} disabled={creating}>
                    {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Send invitation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

      <Card>
          <CardHeader>
            <CardTitle>Platform users</CardTitle>
            <CardDescription>{users.length} accounts</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {initialLoading ? (
              <Loader2 className="mx-auto h-8 w-8 animate-spin" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>ERP role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{jobTitleLabel(u.jobTitle)}</TableCell>
                      <TableCell>{erpRoleLabel(u.role)}</TableCell>
                      <TableCell>{departmentLabel(u.department)}</TableCell>
                      <TableCell>
                        <Select
                          value={normalizeStatus(u.status)}
                          disabled={statusUpdatingId === u.id}
                          onValueChange={(v) =>
                            void updateUserStatus(u.id, v as AdminUserStatus)
                          }
                        >
                          <SelectTrigger className="h-8 w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="disabled">Blocked</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(u)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {deleteTarget?.name ?? 'this user'} from the platform directory. They
              will no longer appear in the list. This cannot be undone from the UI.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault()
                void deleteUser()
              }}
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
