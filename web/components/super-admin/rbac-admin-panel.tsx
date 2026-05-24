'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Crown,
  Loader2,
  Plus,
  RefreshCw,
  Shield,
  UserCog,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { resolvedApiUrl } from '@/lib/apiBase'
import { minTemporaryAccountExpiresAt } from '@/lib/account-expiry'
import {
  coerceDepartmentSectionAccess,
  resolveDepartmentSectionAccess,
} from '@/lib/department-section-access'
import { parseStoredHydroNavAccess } from '@/lib/hydro-nav-access'
import {
  departmentLabel,
  ERP_DEPARTMENTS,
  erpRoleLabel,
  isValidErpDepartment,
} from '@/lib/org-departments'
import {
  ERP_DEPARTMENTS_FOR_RBAC,
  getSectionsForDepartment,
} from '@/lib/rbac/department-sections'
import type {
  Department,
  DepartmentSectionAccess,
  HydroNavAccess,
  Role,
  User,
} from '@/lib/types'

type EnrichedRole = {
  id: string
  code: string
  name: string
  description: string | null
  isSystem: boolean
  userCount: number
  permissionCount: number
  permissionGroup: string
  status: 'active'
}

type RbacStats = {
  totalRoles: number
  totalPermissions: number
  assignedUsers: number
  permissionGroups: number
}

const ASSIGNABLE_ERP_ROLES = new Set(['staff', 'hod'])

type AdminUser = {
  id: string
  email: string
  name: string
  role: string
  department: string | null
  status: string
  platformRoles: string[]
  departmentSectionAccess?: DepartmentSectionAccess | null
  hydroNavAccess?: HydroNavAccess | null
}

function mapApiUser(raw: Record<string, unknown>): AdminUser {
  let departmentSectionAccess: DepartmentSectionAccess | null = null
  const dsa = raw.departmentSectionAccess
  if (dsa && typeof dsa === 'object' && !Array.isArray(dsa)) {
    departmentSectionAccess = dsa as DepartmentSectionAccess
  }
  const statusRaw = String(raw.status ?? 'active').trim().toLowerCase()
  return {
    id: String(raw.id),
    email: String(raw.email ?? ''),
    name: String(raw.name ?? ''),
    role: String(raw.role ?? 'staff')
      .trim()
      .toLowerCase(),
    department:
      raw.department != null
        ? String(raw.department).trim().toLowerCase()
        : null,
    status: statusRaw === 'disabled' ? 'disabled' : 'active',
    platformRoles: Array.isArray(raw.platformRoles)
      ? raw.platformRoles.filter((x): x is string => typeof x === 'string')
      : [],
    departmentSectionAccess,
    hydroNavAccess: parseStoredHydroNavAccess(raw.hydroNavAccess ?? raw.hydro_nav_access),
  }
}

function isActiveDirectoryUser(u: AdminUser): boolean {
  return u.status !== 'disabled'
}

function adminUserAsSessionUser(user: AdminUser, dept: Exclude<Department, null>): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    department: dept,
    status: 'active',
    createdAt: new Date(),
    departmentSectionAccess: user.departmentSectionAccess ?? null,
    hydroNavAccess: user.hydroNavAccess ?? null,
  }
}

function sectionFlagsForUser(
  user: AdminUser,
  dept: Exclude<Department, null>,
): Record<string, boolean> {
  const resolved = resolveDepartmentSectionAccess(adminUserAsSessionUser(user, dept))
  return coerceDepartmentSectionAccess(dept, resolved?.[dept])
}

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const EMPTY_TEMP_USER_FORM = {
  email: '',
  fullName: '',
  department: 'hydrological',
  accountExpiresAt: toDatetimeLocalValue(minTemporaryAccountExpiresAt()),
}

function roleIcon(code: string) {
  if (code === 'super_admin') return Crown
  if (code.includes('admin')) return Shield
  if (code.includes('manager')) return UserCog
  return Users
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function RbacAdminPanel() {
  const [roles, setRoles] = useState<EnrichedRole[]>([])
  const [stats, setStats] = useState<RbacStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [usersLoadFailed, setUsersLoadFailed] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [roleSearch, setRoleSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [groupFilter, setGroupFilter] = useState('all')

  const [assignUserId, setAssignUserId] = useState('')
  const [assignDept, setAssignDept] = useState<Exclude<Department, null> | null>(null)
  const [assignSectionFlags, setAssignSectionFlags] = useState<Record<string, boolean>>({})
  const [assignSaving, setAssignSaving] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null)

  const [tempUserOpen, setTempUserOpen] = useState(false)
  const [tempUserForm, setTempUserForm] = useState(EMPTY_TEMP_USER_FORM)
  const [tempUserCreating, setTempUserCreating] = useState(false)
  const [tempUserError, setTempUserError] = useState<string | null>(null)

  const tempUserExpiresMin = useMemo(
    () => toDatetimeLocalValue(minTemporaryAccountExpiresAt()),
    [tempUserOpen],
  )

  const load = useCallback(async (options?: { refresh?: boolean }) => {
    const isRefresh = options?.refresh === true
    if (isRefresh) setRefreshing(true)
    else setInitialLoading(true)
    try {
      setUsersLoadFailed(false)
      const [rolesRes, usersRes] = await Promise.all([
        fetch(resolvedApiUrl('/api/super-admin/roles'), { credentials: 'include' }),
        fetch(
          resolvedApiUrl('/api/super-admin/users?includePlatformRoles=1&limit=500'),
          { credentials: 'include' },
        ),
      ])
      if (rolesRes.ok) {
        const data = await rolesRes.json()
        const nextRoles = (data.roles ?? []) as EnrichedRole[]
        setRoles(nextRoles)
        setStats(data.stats ?? null)
      }
      if (usersRes.ok) {
        const uData = await usersRes.json()
        const items = (uData.items ?? []) as Record<string, unknown>[]
        setUsers(items.map(mapApiUser).filter(isActiveDirectoryUser))
      } else {
        setUsers([])
        setUsersLoadFailed(true)
      }
    } finally {
      if (isRefresh) setRefreshing(false)
      else setInitialLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const assignableUsers = useMemo(() => {
    return users
      .filter(
        (u) =>
          ASSIGNABLE_ERP_ROLES.has(u.role) &&
          u.department != null &&
          isValidErpDepartment(u.department),
      )
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  }, [users])

  const assignSelectedUser = useMemo(
    () => assignableUsers.find((u) => u.id === assignUserId) ?? null,
    [assignableUsers, assignUserId],
  )

  const groupFilterOptions = useMemo(
    () => ERP_DEPARTMENTS_FOR_RBAC.map((d) => d.label),
    [],
  )

  const filteredRoles = useMemo(() => {
    const q = roleSearch.trim().toLowerCase()
    return roles.filter((r) => {
      if (statusFilter === 'active' && r.status !== 'active') return false
      if (statusFilter === 'inactive' && r.status === 'active') return false
      if (groupFilter !== 'all' && r.permissionGroup !== groupFilter) return false
      if (!q) return true
      return (
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q)
      )
    })
  }, [roles, roleSearch, statusFilter, groupFilter])

  const assignSections = useMemo(
    () => (assignDept ? getSectionsForDepartment(assignDept) : []),
    [assignDept],
  )

  const applyUserSelection = useCallback((user: AdminUser | null) => {
    setAssignError(null)
    setAssignSuccess(null)
    if (!user || !user.department || !isValidErpDepartment(user.department)) {
      setAssignUserId('')
      setAssignDept(null)
      setAssignSectionFlags({})
      return
    }
    const dept = user.department as Exclude<Department, null>
    setAssignUserId(user.id)
    setAssignDept(dept)
    setAssignSectionFlags(sectionFlagsForUser(user, dept))
  }, [])

  const handleAssignUserChange = useCallback(
    (userId: string) => {
      const user = assignableUsers.find((u) => u.id === userId) ?? null
      applyUserSelection(user)
    },
    [assignableUsers, applyUserSelection],
  )

  const toggleAssignSection = (sectionId: string, checked: boolean) => {
    setAssignSectionFlags((prev) => ({ ...prev, [sectionId]: checked }))
    setAssignError(null)
    setAssignSuccess(null)
  }

  const saveUserSectionAccess = async () => {
    if (!assignUserId || !assignDept) {
      setAssignError('Select a user.')
      return
    }
    setAssignSaving(true)
    setAssignError(null)
    setAssignSuccess(null)
    try {
      const user = assignSelectedUser
      const merged: DepartmentSectionAccess = { ...(user?.departmentSectionAccess ?? {}) }
      merged[assignDept] = coerceDepartmentSectionAccess(assignDept, assignSectionFlags)

      const res = await fetch(resolvedApiUrl(`/api/super-admin/users/${assignUserId}`), {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentSectionAccess: merged }),
      })
      const data = (await res.json()) as {
        error?: string
        departmentSectionAccess?: DepartmentSectionAccess
        hydroNavAccess?: HydroNavAccess | null
      }
      if (!res.ok) {
        setAssignError(data.error ?? 'Could not save section access.')
        return
      }
      const savedAccess = data.departmentSectionAccess ?? merged
      setAssignSuccess(`Section access updated for ${user?.name ?? 'user'}.`)
      setUsers((prev) =>
        prev.map((u) =>
          u.id === assignUserId
            ? {
                ...u,
                departmentSectionAccess: savedAccess,
                ...(data.hydroNavAccess !== undefined
                  ? { hydroNavAccess: data.hydroNavAccess }
                  : {}),
              }
            : u,
        ),
      )
      if (user) {
        const updated: AdminUser = {
          ...user,
          departmentSectionAccess: savedAccess,
          hydroNavAccess:
            data.hydroNavAccess !== undefined ? data.hydroNavAccess : user.hydroNavAccess,
        }
        setAssignSectionFlags(sectionFlagsForUser(updated, assignDept))
      }
    } catch {
      setAssignError('Network error. Try again.')
    } finally {
      setAssignSaving(false)
    }
  }

  const clearRoleFilters = () => {
    setRoleSearch('')
    setStatusFilter('all')
    setGroupFilter('all')
  }

  const createTemporaryUser = async () => {
    const email = tempUserForm.email.trim().toLowerCase()
    const fullName = tempUserForm.fullName.trim()
    if (!email || !fullName || !tempUserForm.accountExpiresAt) {
      setTempUserError('Full name, email, and access end time are required.')
      return
    }
    setTempUserError(null)
    setTempUserCreating(true)
    try {
      const expiresAt = new Date(tempUserForm.accountExpiresAt)
      const res = await fetch(resolvedApiUrl('/api/super-admin/users/temporary'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          fullName,
          department: tempUserForm.department,
          accountExpiresAt: expiresAt.toISOString(),
        }),
      })
      const data = (await res.json()) as Record<string, unknown> & {
        error?: string
        message?: string
        invitationEmailDispatched?: boolean
        inviteUrl?: string
      }
      if (!res.ok) {
        if (data.inviteUrl && res.status === 502) {
          setTempUserOpen(false)
          setTempUserForm({
            ...EMPTY_TEMP_USER_FORM,
            accountExpiresAt: toDatetimeLocalValue(minTemporaryAccountExpiresAt()),
          })
          void load({ refresh: true })
          toast.warning(
            `${data.error ?? 'Email could not be sent.'} Share this link: ${data.inviteUrl}`,
          )
          return
        }
        setTempUserError(data.error ?? 'Could not create temporary user.')
        return
      }
      setTempUserOpen(false)
      setTempUserForm({
        ...EMPTY_TEMP_USER_FORM,
        accountExpiresAt: toDatetimeLocalValue(minTemporaryAccountExpiresAt()),
      })
      void load({ refresh: true })
      if (data.invitationEmailDispatched) {
        toast.success(data.message ?? 'Temporary user created and invitation sent.')
      } else if (data.inviteUrl) {
        toast.success(
          `Temporary user created. Share the set-password link: ${String(data.inviteUrl)}`,
        )
      } else {
        toast.success(data.message ?? 'Temporary user created.')
      }
    } catch {
      setTempUserError('Network error. Try again.')
    } finally {
      setTempUserCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
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
            open={tempUserOpen}
            onOpenChange={(open) => {
              setTempUserOpen(open)
              if (!open) {
                setTempUserError(null)
                setTempUserForm({
                  ...EMPTY_TEMP_USER_FORM,
                  accountExpiresAt: toDatetimeLocalValue(minTemporaryAccountExpiresAt()),
                })
              }
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Create Temporary User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create temporary user</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Invites a Staff user with department access until the date you set. They receive an
                email to set their password.
              </p>
              {tempUserError ? (
                <Alert variant="destructive">
                  <AlertDescription>{tempUserError}</AlertDescription>
                </Alert>
              ) : null}
              <div className="grid gap-3">
                <div className="space-y-2">
                  <Label htmlFor="rbac-temp-fullName">Full name</Label>
                  <Input
                    id="rbac-temp-fullName"
                    value={tempUserForm.fullName}
                    onChange={(e) =>
                      setTempUserForm((f) => ({ ...f, fullName: e.target.value }))
                    }
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rbac-temp-email">Email</Label>
                  <Input
                    id="rbac-temp-email"
                    type="email"
                    value={tempUserForm.email}
                    onChange={(e) =>
                      setTempUserForm((f) => ({ ...f, email: e.target.value }))
                    }
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select
                    value={tempUserForm.department}
                    onValueChange={(v) =>
                      setTempUserForm((f) => ({ ...f, department: v }))
                    }
                  >
                    <SelectTrigger>
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
                <div className="space-y-2">
                  <Label htmlFor="rbac-temp-expires">Access ends</Label>
                  <Input
                    id="rbac-temp-expires"
                    type="datetime-local"
                    min={tempUserExpiresMin}
                    value={tempUserForm.accountExpiresAt}
                    onChange={(e) =>
                      setTempUserForm((f) => ({
                        ...f,
                        accountExpiresAt: e.target.value,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    The account stops working after this date and time (minimum one hour from now).
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTempUserOpen(false)}
                  disabled={tempUserCreating}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => void createTemporaryUser()}
                  disabled={tempUserCreating}
                >
                  {tempUserCreating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Create and send invite
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
      </div>

      {initialLoading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Roles</CardDescription>
              <CardTitle className="text-3xl">{stats?.totalRoles ?? roles.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Assigned Users</CardDescription>
              <CardTitle className="text-3xl">{stats?.assignedUsers ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Departments</CardDescription>
              <CardTitle className="text-3xl">{stats?.permissionGroups ?? ERP_DEPARTMENTS_FOR_RBAC.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-muted/60 p-1">
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="assignments">User access</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base">Filters</CardTitle>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={clearRoleFilters}
                >
                  Reset
                </button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Search Roles</Label>
                  <Input
                    placeholder="Search…"
                    value={roleSearch}
                    onChange={(e) => setRoleSearch(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={groupFilter} onValueChange={setGroupFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {groupFilterOptions.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" className="w-full" onClick={clearRoleFilters}>
                  Clear Filters
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Roles ({filteredRoles.length})</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                {initialLoading ? (
                  <div className="space-y-2 p-4">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Role Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Users</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRoles.map((r) => {
                        const Icon = roleIcon(r.code)
                        return (
                          <TableRow key={r.id}>
                            <TableCell>
                              <div className="flex items-center gap-2 font-medium">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                  <Icon className="h-4 w-4" />
                                </span>
                                {r.name}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-muted-foreground">
                              {r.description ?? '—'}
                            </TableCell>
                            <TableCell className="text-right">{r.userCount}</TableCell>
                            <TableCell>{r.permissionGroup}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                                Active
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">User section access</CardTitle>
              <CardDescription>
                Choose which in-app sections Staff and Head of Department users can access in
                their department.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {assignSuccess ? (
                <Alert>
                  <AlertDescription>{assignSuccess}</AlertDescription>
                </Alert>
              ) : null}
              {assignError ? (
                <Alert variant="destructive">
                  <AlertDescription>{assignError}</AlertDescription>
                </Alert>
              ) : null}
              {usersLoadFailed ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    Could not load users. Refresh the page or check the database connection.
                  </AlertDescription>
                </Alert>
              ) : null}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <div className="min-w-0 space-y-2">
                  <Label>User</Label>
                  <Select
                    value={assignUserId || undefined}
                    onValueChange={handleAssignUserChange}
                  >
                    <SelectTrigger
                      className="w-full min-w-0 max-w-full"
                      title={
                        assignSelectedUser
                          ? `${assignSelectedUser.name} (${assignSelectedUser.email})`
                          : undefined
                      }
                    >
                      <SelectValue placeholder="Select user">
                        {assignSelectedUser?.name ?? null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-w-[min(100vw-2rem,28rem)]">
                      {assignableUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id} className="items-start py-2">
                          <span className="flex min-w-0 flex-col gap-0.5 text-left">
                            <span className="font-medium leading-tight">{u.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {u.email} · {erpRoleLabel(u.role)}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {assignableUsers.length === 0 && !initialLoading && !usersLoadFailed ? (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        No active users with a department (Staff or Head of Department). Create them
                        under{' '}
                        <Link
                          href="/super-admin/settings/users"
                          className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                          Settings → Users
                        </Link>
                        .
                      </p>
                      {users.length > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Administrator and Director General accounts have no department; section
                          access applies to Staff and HoD.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <div className="shrink-0 space-y-2 sm:pb-0.5">
                  <Label>Department</Label>
                  <p
                    className={`flex min-h-9 items-center whitespace-nowrap text-sm sm:min-h-10 ${
                      assignDept ? 'font-medium' : 'text-muted-foreground'
                    }`}
                  >
                    {assignDept ? departmentLabel(assignDept) : '—'}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Sections</Label>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {assignSections.map((section) => (
                    <label
                      key={section.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <Checkbox
                        checked={assignSectionFlags[section.id] === true}
                        disabled={!assignUserId}
                        onCheckedChange={(c) => toggleAssignSection(section.id, c === true)}
                      />
                      <span>{section.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <Button
                onClick={() => void saveUserSectionAccess()}
                disabled={assignSaving || !assignUserId}
              >
                {assignSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save section access
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
