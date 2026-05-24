'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Mail,
  MoreHorizontal,
  Shield,
  UserPlus,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useSessionUser } from '@/components/demo-session-provider'
import { formatDate } from '@/lib/mock-data'
import type { Role, Department, User, HydroNavAccess } from '@/lib/types'
import {
  allocateUsernameFromEmail,
  mapDirectoryUserToAdminUser,
  type AdminUser,
  VALID_ROLES,
} from '@/lib/admin-users-mock'
import { Checkbox } from '@/components/ui/checkbox'
import {
  coerceHydroNavAccess,
  defaultFullHydroNavAccess,
  HYDRO_NAV_ACCESS_KEYS,
  HYDRO_NAV_ACCESS_LABELS,
  hydroNavAccessAllowsAny,
} from '@/lib/hydro-nav-access'
import { apiErrorMessage, fetchJson } from '@/lib/fetch-json'
import {
  canManageDirectoryUser,
  canManageOrgSettings,
  canInviteUsers as policyCanInviteUsers,
  canViewUserDirectory,
  roleDisplayLabel,
} from '@/lib/settings-access-policy'

/** Admin invite flow only — canonical department keys match the ERP scope model. */
const ADMIN_INVITE_DEPARTMENTS: {
  value: Exclude<Department, null>
  label: string
}[] = [
  { value: 'hydrological', label: 'Hydrological Services Department' },
  { value: 'boreholes', label: 'Borehole department' },
  { value: 'financial', label: 'Finance department' },
  { value: 'hr', label: 'HR & ADMIN department' },
]

function adminDepartmentLabel(dept: Department): string {
  if (!dept) return '—'
  const hit = ADMIN_INVITE_DEPARTMENTS.find((d) => d.value === dept)
  return hit?.label ?? dept.replace(/_/g, ' ')
}

function userCanManageRow(viewer: User, u: AdminUser): boolean {
  if (u.id === viewer.id && viewer.role === 'hod') return true
  return canManageDirectoryUser(viewer, { role: u.role, department: u.department })
}

const ORG_INVITE_ROLES: Role[] = ['dg', 'hod', 'staff']

function roleBadgeClass(role: Role) {
  switch (role) {
    case 'admin':
      return 'bg-primary/15 text-primary'
    case 'dg':
      return 'bg-violet-500/15 text-violet-700 dark:text-violet-300'
    case 'hod':
      return 'bg-secondary/15 text-secondary'
    case 'staff':
      return 'bg-muted text-muted-foreground'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

type UserFormState = {
  email: string
  fullName: string
  role: Role
  department: Department
  password: string
  isActive: boolean
  hydroNavAccess: HydroNavAccess
}

const emptyForm = (opts?: { orgManager?: boolean }): UserFormState => ({
  email: '',
  fullName: '',
  role: opts?.orgManager ? 'hod' : 'staff',
  department: opts?.orgManager ? 'hr' : 'hydrological',
  password: '',
  isActive: true,
  hydroNavAccess: defaultFullHydroNavAccess(),
})

export default function SettingsUsersPage() {
  const router = useRouter()
  const { user: sessionUser, actingUserHeaders } = useSessionUser()
  const isOrgUserManager = canManageOrgSettings(sessionUser)
  const isLineHod = sessionUser.role === 'hod' && !!sessionUser.department && !isOrgUserManager
  const canInviteUsers = policyCanInviteUsers(sessionUser)
  const mayViewDirectory = canViewUserDirectory(sessionUser)
  const [rows, setRows] = useState<AdminUser[]>([])
  const [inviteSending, setInviteSending] = useState(false)
  const [banner, setBanner] = useState<{
    type: 'note' | 'success' | 'destructive'
    text: string
  } | null>(null)

  const loadDirectory = useCallback(async () => {
    const result = await fetchJson<{ users?: User[]; error?: string; hint?: string }>(
      '/api/users/directory',
      { headers: { ...actingUserHeaders } }
    )
    if (!result.ok) {
      if (result.networkError) {
        setBanner({
          type: 'destructive',
          text: result.message,
        })
        return
      }
      setBanner({
        type: 'destructive',
        text: apiErrorMessage(
          result.data,
          'Could not load the user directory. Check DATABASE_URL and run Prisma migrations.'
        ),
      })
      return
    }
    const mapped = (result.data.users ?? []).map(mapDirectoryUserToAdminUser)
    setRows([...mapped].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()))
  }, [actingUserHeaders])

  useEffect(() => {
    if (!mayViewDirectory) {
      router.replace('/settings/profile')
      return
    }
    void loadDirectory()
  }, [loadDirectory, mayViewDirectory, router])

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<UserFormState>(() =>
    emptyForm({ orgManager: canManageOrgSettings(sessionUser) }),
  )

  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)

  const visibleRows = useMemo(() => {
    if (isOrgUserManager || sessionUser.role === 'dg') return rows
    if (sessionUser.role === 'hod' && sessionUser.department) {
      return rows.filter(
        (u) => u.department === sessionUser.department || u.id === sessionUser.id,
      )
    }
    return rows
  }, [rows, isOrgUserManager, sessionUser.role, sessionUser.department, sessionUser.id])

  function openEdit(u: AdminUser) {
    setEditingId(u.id)
    setForm({
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      department: u.department,
      password: '',
      isActive: u.isActive,
      hydroNavAccess:
        u.role === 'staff' && u.department === 'hydrological'
          ? u.hydroNavAccess != null
            ? { ...defaultFullHydroNavAccess(), ...u.hydroNavAccess }
            : defaultFullHydroNavAccess()
          : defaultFullHydroNavAccess(),
    })
    setEditOpen(true)
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canInviteUsers) return

    const email = form.email.trim().toLowerCase()
    const fullName = form.fullName.trim()
    if (!email || !fullName) return

    const inviteRole: Role = isOrgUserManager ? form.role : 'staff'
    const dept: Department =
      inviteRole === 'dg'
        ? null
        : isOrgUserManager
          ? form.department
          : sessionUser.department

    if (inviteRole !== 'dg' && !dept) {
      setBanner({
        type: 'destructive',
        text: isOrgUserManager
          ? 'Choose a department for HOD or staff.'
          : 'Your account has no department; contact HR & Admin.',
      })
      return
    }

    const username = allocateUsernameFromEmail(email)
    const hydroInvite =
      inviteRole === 'staff' && dept === 'hydrological'
        ? coerceHydroNavAccess(form.hydroNavAccess)
        : null
    if (hydroInvite != null && !hydroNavAccessAllowsAny(hydroInvite)) {
      setBanner({
        type: 'destructive',
        text: 'Select at least one Hydrological access area.',
      })
      return
    }

    setInviteSending(true)
    try {
      const result = await fetchJson<{
        error?: string
        hint?: string
        invitationEmailDispatched?: boolean
        smtpConfigured?: boolean
        inviteUrl?: string
        notifyDispatched?: boolean
        message?: string
      }>('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...actingUserHeaders },
        body: JSON.stringify({
          email,
          fullName,
          role: inviteRole,
          department: inviteRole === 'dg' ? null : dept,
          username,
          ...(hydroInvite != null ? { hydroNavAccess: hydroInvite } : {}),
        }),
      })
      if (!result.ok) {
        if (result.networkError) {
          setBanner({ type: 'destructive', text: result.message })
          return
        }
        const failData = result.data
        if (result.status === 502) {
          await loadDirectory()
          setAddOpen(false)
          setForm(emptyForm({ orgManager: isOrgUserManager }))
          setBanner({
            type: 'destructive',
            text:
              [failData.error, failData.hint].filter(Boolean).join(' ') ||
              'Invitation email could not be sent. The user is in the directory — fix SMTP and use Resend invitation.',
          })
          return
        }
        setBanner({
          type: 'destructive',
          text: apiErrorMessage(failData, 'Invitation request failed.'),
        })
        return
      }

      const data = result.data

      await loadDirectory()
      setAddOpen(false)
      setForm(emptyForm({ orgManager: isOrgUserManager }))

      if (data.invitationEmailDispatched) {
        const extra =
          data.notifyDispatched === true ? ' An admin notification email was sent.' : ''
        setBanner({
          type: 'success',
          text: `Invitation email sent to ${email}.${extra}`,
        })
      } else if (data.smtpConfigured === false && data.inviteUrl) {
        setBanner({
          type: 'note',
          text:
            data.message ??
            `SMTP is not configured. Add SMTP_* variables to .env.local, or share this link manually: ${data.inviteUrl}`,
        })
      } else {
        setBanner({
          type: 'success',
          text: 'User added locally.',
        })
      }
    } finally {
      setInviteSending(false)
    }
  }

  async function resendInvitation(u: AdminUser) {
    if (!userCanManageRow(sessionUser, u)) {
      setBanner({
        type: 'destructive',
        text: 'You do not have permission to resend this invitation.',
      })
      return
    }

    setInviteSending(true)
    try {
      const result = await fetchJson<{
        error?: string
        hint?: string
        invitationEmailDispatched?: boolean
        smtpConfigured?: boolean
        inviteUrl?: string
        notifyDispatched?: boolean
      }>('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...actingUserHeaders },
        body: JSON.stringify({
          email: u.email,
          fullName: u.fullName,
          role: u.role,
          department: u.department,
          username: u.username,
          ...(u.role === 'staff' && u.department === 'hydrological'
            ? {
                hydroNavAccess: coerceHydroNavAccess(
                  u.hydroNavAccess ?? defaultFullHydroNavAccess(),
                ),
              }
            : {}),
        }),
      })
      if (!result.ok) {
        if (result.networkError) {
          setBanner({ type: 'destructive', text: result.message })
          return
        }
        const failData = result.data
        if (result.status === 502) {
          await loadDirectory()
          setBanner({
            type: 'destructive',
            text:
              [failData.error, failData.hint].filter(Boolean).join(' ') ||
              'Could not resend the invitation email. Invite expiry was refreshed — fix SMTP and try again.',
          })
          return
        }
        setBanner({
          type: 'destructive',
          text: apiErrorMessage(failData, 'Could not resend the invitation email.'),
        })
        return
      }

      const data = result.data

      await loadDirectory()

      if (data.invitationEmailDispatched) {
        const extra =
          data.notifyDispatched === true ? ' Admin notification sent.' : ''
        setBanner({
          type: 'success',
          text: `Invitation resent to ${u.email}.${extra}`,
        })
      } else if (!data.smtpConfigured && data.inviteUrl) {
        setBanner({
          type: 'note',
          text: `SMTP not configured. Share this link manually: ${data.inviteUrl}`,
        })
      } else {
        setBanner({
          type: 'success',
          text: `Invitation refreshed for ${u.email}.`,
        })
      }
    } finally {
      setInviteSending(false)
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId) return
    const prev = rows.find((r) => r.id === editingId)
    if (!prev) return

    if (!userCanManageRow(sessionUser, prev)) {
      setBanner({
        type: 'destructive',
        text: 'You do not have permission to edit this user.',
      })
      return
    }

    const email = form.email.trim().toLowerCase()
    const fullName = form.fullName.trim()
    if (!email || !fullName) return

    let dept: Department =
      form.role === 'dg'
        ? null
        : form.role === 'hod' || form.role === 'staff'
          ? form.department
          : null

    if (isLineHod && sessionUser.department && userCanManageRow(sessionUser, prev)) {
      dept = sessionUser.department
    }

    if ((form.role === 'hod' || form.role === 'staff') && !dept) {
      setBanner({
        type: 'destructive',
        text: 'Choose a department.',
      })
      return
    }

    const hydroPatch =
      form.role === 'staff' && dept === 'hydrological'
        ? coerceHydroNavAccess(form.hydroNavAccess)
        : null
    if (hydroPatch != null && !hydroNavAccessAllowsAny(hydroPatch)) {
      setBanner({
        type: 'destructive',
        text: 'Select at least one Hydrological access area.',
      })
      return
    }

    const result = await fetchJson<{ error?: string; hint?: string }>(
      `/api/users/${encodeURIComponent(editingId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...actingUserHeaders },
        body: JSON.stringify({
          fullName,
          ...(hydroPatch != null ? { hydroNavAccess: hydroPatch } : {}),
        }),
      }
    )
    if (!result.ok) {
      if (result.networkError) {
        setBanner({ type: 'destructive', text: result.message })
        return
      }
      setBanner({
        type: 'destructive',
        text: apiErrorMessage(result.data, 'Could not save user.'),
      })
      return
    }
    await loadDirectory()
    setEditOpen(false)
    setEditingId(null)
    setForm(emptyForm({ orgManager: isOrgUserManager }))
    setBanner({ type: 'success', text: 'User updated.' })
  }

  function confirmDelete() {
    if (!deleteTarget) return
    if (deleteTarget.id === sessionUser.id) return
    if (!userCanManageRow(sessionUser, deleteTarget)) {
      return
    }
    setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id))
    setDeleteTarget(null)
    setBanner({ type: 'success', text: 'User removed from local list.' })
  }

  const showDept = form.role === 'hod' || form.role === 'staff'
  const editRoleChoices: Role[] = isLineHod
    ? editingId === sessionUser.id
      ? ['hod']
      : ['staff']
    : isOrgUserManager
      ? VALID_ROLES.filter((r) => r !== 'admin')
      : showDept && form.department === 'hydrological'
        ? form.role === 'staff'
          ? ['staff']
          : Array.from(new Set<Role>([form.role, 'staff']))
        : VALID_ROLES.filter((r) => r !== 'admin')

  if (!mayViewDirectory) {
    return null
  }

  const addShowDept = form.role === 'hod' || form.role === 'staff'
  const addShowHydroPermissions =
    form.role === 'staff' &&
    form.department === 'hydrological' &&
    (isLineHod || isOrgUserManager)

  return (
    <div className="min-w-0 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-foreground">Users</h2>
          {canInviteUsers ? (
            <Button
              className="gap-2"
              onClick={() => {
                const base = emptyForm({ orgManager: isOrgUserManager })
                setForm({
                  ...base,
                  department:
                    isLineHod && sessionUser.department
                      ? sessionUser.department
                      : base.department,
                })
                setAddOpen(true)
              }}
            >
              <UserPlus className="h-4 w-4" />
              {isOrgUserManager ? 'Invite user' : 'Add staff'}
            </Button>
          ) : null}
        </div>

        {banner && (
        <Alert variant={banner.type === 'destructive' ? 'destructive' : 'default'}>
          {banner.type === 'destructive' ? (
            <AlertTriangle className="h-4 w-4" />
          ) : banner.type === 'note' ? (
            <Clock className="h-4 w-4" />
          ) : (
            <Shield className="h-4 w-4" />
          )}
          <AlertTitle>
            {banner.type === 'success'
              ? 'Saved'
              : banner.type === 'destructive'
                ? 'Could not save'
                : 'Next step'}
          </AlertTitle>
          <AlertDescription>{banner.text}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="gap-1">
          <CardTitle>Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      {isLineHod
                        ? 'No users in your department yet.'
                        : 'No users yet.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleRows.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{u.fullName}</span>
                          <span className="text-xs text-muted-foreground">{u.email}</span>
                          <span className="text-xs text-muted-foreground">@{u.username}</span>
                          <span className="text-xs text-muted-foreground">
                            Added {formatDate(u.createdAt)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={roleBadgeClass(u.role)}>
                          {roleDisplayLabel(u.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{adminDepartmentLabel(u.department)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {u.pendingPasswordSetup ? (
                            <Badge variant="outline" className="w-fit gap-1 border-amber-500/50 text-amber-800 dark:text-amber-200">
                              <Mail className="h-3 w-3" />
                              Invite pending
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="w-fit border-emerald-500/40 text-emerald-800 dark:text-emerald-200">
                              Password set
                            </Badge>
                          )}
                          {u.pendingPasswordSetup && u.inviteExpired && (
                            <Badge variant="destructive" className="w-fit gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Invite expired
                            </Badge>
                          )}
                          {u.role === 'staff' && u.department === 'hydrological' ? (
                            <span className="text-xs text-muted-foreground">
                              {u.hydroNavAccess == null
                                ? 'Hydrological access: all areas'
                                : HYDRO_NAV_ACCESS_KEYS.filter((k) => u.hydroNavAccess?.[k] === true)
                                    .map((k) => HYDRO_NAV_ACCESS_LABELS[k])
                                    .join(', ') || 'No areas selected'}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {u.isActive ? (
                          <Badge className="bg-secondary/15 text-secondary">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              disabled={!userCanManageRow(sessionUser, u)}
                              onClick={() => openEdit(u)}
                            >
                              Edit
                            </DropdownMenuItem>
                            {u.pendingPasswordSetup && (
                              <DropdownMenuItem
                                disabled={inviteSending || !userCanManageRow(sessionUser, u)}
                                onClick={() => void resendInvitation(u)}
                              >
                                Resend invitation
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              disabled={
                                u.id === sessionUser.id || !userCanManageRow(sessionUser, u)
                              }
                              onClick={() => setDeleteTarget(u)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="flex max-h-[min(90vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <form className="flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={handleAddSubmit}>
            <DialogHeader className="shrink-0 space-y-1 px-6 pt-6 pb-2">
              <DialogTitle>
                {isOrgUserManager ? 'Invite user' : 'Add department staff'}
              </DialogTitle>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">
            <div className="grid gap-4 pb-4">
              <div className="grid gap-2">
                <Label htmlFor="add-email">Email</Label>
                <Input
                  id="add-email"
                  type="email"
                  autoComplete="off"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="add-name">Full name</Label>
                <Input
                  id="add-name"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                />
              </div>
              <div className="grid gap-4 rounded-lg border p-4">
                <p className="text-sm font-medium text-foreground">Role &amp; permissions</p>
                {isOrgUserManager ? (
                <div className="grid gap-2">
                  <Label htmlFor="add-role">Role</Label>
                  <Select
                    value={form.role}
                    onValueChange={(v) => {
                      const r = v as Role
                      setForm((f) => ({
                        ...f,
                        role: r,
                        department:
                          r === 'dg'
                            ? null
                            : f.department ?? 'hr',
                        hydroNavAccess:
                          r === 'staff' && (f.department ?? 'hr') === 'hydrological'
                            ? defaultFullHydroNavAccess()
                            : f.hydroNavAccess,
                      }))
                    }}
                  >
                    <SelectTrigger id="add-role" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORG_INVITE_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {roleDisplayLabel(r)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label>Role</Label>
                  <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                    {roleDisplayLabel('staff')}
                  </p>
                </div>
              )}
              {isOrgUserManager && addShowDept ? (
                <div className="grid gap-2">
                  <Label htmlFor="add-dept">Department</Label>
                  <Select
                    value={form.department ?? ''}
                    onValueChange={(v) => {
                      const dept = v as Exclude<Department, null>
                      setForm((f) => ({
                        ...f,
                        department: dept,
                        hydroNavAccess:
                          form.role === 'staff' && dept === 'hydrological'
                            ? defaultFullHydroNavAccess()
                            : f.hydroNavAccess,
                      }))
                    }}
                  >
                    <SelectTrigger id="add-dept" className="w-full">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {ADMIN_INVITE_DEPARTMENTS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : !isOrgUserManager ? (
                <div className="grid gap-2">
                  <Label>Department</Label>
                  <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                    {adminDepartmentLabel(sessionUser.department)}
                  </p>
                </div>
              ) : null}
              {addShowHydroPermissions ? (
                <div className="grid gap-2">
                  <Label>Permissions</Label>
                  <p className="text-muted-foreground text-xs">
                    Hydrological sidebar areas this staff member may open.
                  </p>
                  <div className="grid gap-2 rounded-lg border bg-background p-3 sm:grid-cols-2">
                    {HYDRO_NAV_ACCESS_KEYS.map((key) => (
                      <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={form.hydroNavAccess[key] === true}
                          onCheckedChange={(c) =>
                            setForm((f) => ({
                              ...f,
                              hydroNavAccess: { ...f.hydroNavAccess, [key]: c === true },
                            }))
                          }
                        />
                        {HYDRO_NAV_ACCESS_LABELS[key]}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
              </div>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <Label htmlFor="add-active" className="cursor-pointer">
                  Active
                </Label>
                <Switch
                  id="add-active"
                  checked={form.isActive}
                  onCheckedChange={(c) => setForm((f) => ({ ...f, isActive: c }))}
                />
              </div>
            </div>
            </div>
            <DialogFooter className="shrink-0 gap-2 border-t px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={inviteSending}>
                {inviteSending ? 'Sending invitation…' : 'Send invitation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="flex max-h-[min(90vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <form
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            onSubmit={(e) => void handleEditSubmit(e)}
          >
            <DialogHeader className="shrink-0 space-y-1 px-6 pt-6 pb-2">
              <DialogTitle>Edit user</DialogTitle>
              <DialogDescription>
                Update display name and Hydrological access. Email changes are not applied from this screen yet.
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">
            <div className="grid gap-4 pb-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Full name</Label>
                <Input
                  id="edit-name"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => {
                    const r = v as Role
                    setForm((f) => ({
                      ...f,
                      role: r,
                      department:
                        r === 'dg'
                          ? null
                          : r === 'hod' || r === 'staff'
                            ? f.department ?? 'hydrological'
                            : null,
                    }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {editRoleChoices.map((r) => (
                      <SelectItem key={r} value={r}>
                        {roleDisplayLabel(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {showDept && (
                <div className="grid gap-2">
                  <Label htmlFor="edit-dept">Department</Label>
                  <Select
                    value={form.department ?? ''}
                    disabled={isLineHod}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        department: v as Exclude<Department, null>,
                      }))
                    }
                  >
                    <SelectTrigger id="edit-dept" className="w-full">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {ADMIN_INVITE_DEPARTMENTS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {showDept &&
              form.role === 'staff' &&
              form.department === 'hydrological' &&
              (isOrgUserManager || (isLineHod && sessionUser.department === 'hydrological')) ? (
                <div className="grid gap-2">
                  <Label>Permissions</Label>
                  <p className="text-muted-foreground text-xs">
                    Hydrological sidebar areas this staff member may open.
                  </p>
                  <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
                    {HYDRO_NAV_ACCESS_KEYS.map((key) => (
                      <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={form.hydroNavAccess[key] === true}
                          onCheckedChange={(c) =>
                            setForm((f) => ({
                              ...f,
                              hydroNavAccess: { ...f.hydroNavAccess, [key]: c === true },
                            }))
                          }
                        />
                        {HYDRO_NAV_ACCESS_LABELS[key]}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <Label htmlFor="edit-active" className="cursor-pointer">
                  Active
                </Label>
                <Switch
                  id="edit-active"
                  checked={form.isActive}
                  onCheckedChange={(c) => setForm((f) => ({ ...f, isActive: c }))}
                />
              </div>
            </div>
            </div>
            <DialogFooter className="shrink-0 gap-2 border-t px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes <strong>{deleteTarget?.fullName}</strong> from the local list only. Hook up{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">DELETE /api/admin/users/:id</code>{' '}
              when your backend is ready.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
