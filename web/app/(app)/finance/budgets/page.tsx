'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Wallet,
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { formatCurrency, formatDate, departmentNames } from '@/lib/mock-data'
import { resolvedApiUrl } from '@/lib/apiBase'
import { DG_BUDGET_OVERVIEW_QUERY_KEY } from '@/lib/dgQueryKeys'

export type FinanceBudgetJson = {
  id: number
  budgetCode: string
  department: string
  project: string
  source: 'donor' | 'local'
  totalAmount: number
  utilizedAmount: number
  availableBalance: number
  fiscalYear: string
  createdAt: string
}

type CreateBudgetFormState = {
  department: string
  project: string
  source: 'donor' | 'local'
  totalAmount: string
  fiscalYear: string
}

type EditBudgetFormState = CreateBudgetFormState & { budgetCode: string }

const emptyCreateForm = (): CreateBudgetFormState => ({
  department: '',
  project: '',
  source: 'local',
  totalAmount: '',
  fiscalYear: '2024/25',
})

function departmentLabel(key: string) {
  return departmentNames[key] ?? key
}

export default function FinanceBudgetsPage() {
  const queryClient = useQueryClient()
  const [budgets, setBudgets] = useState<FinanceBudgetJson[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sourceTab, setSourceTab] = useState<'all' | 'donor' | 'local'>('all')

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateBudgetFormState>(() => emptyCreateForm())
  const [createBusy, setCreateBusy] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  /** Next code from server when department + fiscal year are set (create dialog). */
  const [previewBudgetCode, setPreviewBudgetCode] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const previewAbortRef = useRef<AbortController | null>(null)
  const previewSeqRef = useRef(0)
  const createFormRef = useRef(createForm)
  createFormRef.current = createForm

  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<FinanceBudgetJson | null>(null)
  const [editForm, setEditForm] = useState<EditBudgetFormState>({
    budgetCode: '',
    ...emptyCreateForm(),
  })
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<FinanceBudgetJson | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const fetchBudgets = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch(resolvedApiUrl('/api/finance/budgets'), { credentials: 'include' })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const msg =
          data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
            ? data.error
            : `Failed to load budgets (${res.status})`
        throw new Error(msg)
      }
      setBudgets(Array.isArray(data) ? data : [])
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load budgets')
      setBudgets([])
    } finally {
      setLoading(false)
    }
  }, [])

  const invalidateDgBudgetOverview = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [...DG_BUDGET_OVERVIEW_QUERY_KEY] })
  }, [queryClient])

  useEffect(() => {
    void fetchBudgets()
  }, [fetchBudgets])

  useEffect(() => {
    previewAbortRef.current?.abort()
    setPreviewError(null)
    if (!createOpen) {
      setPreviewBudgetCode(null)
      setPreviewLoading(false)
      return
    }
    const dept = createForm.department.trim()
    const fy = createForm.fiscalYear.trim()
    if (!dept || fy.length < 2) {
      setPreviewBudgetCode(null)
      setPreviewLoading(false)
      return
    }
    const mySeq = ++previewSeqRef.current
    const t = window.setTimeout(() => {
      const ac = new AbortController()
      previewAbortRef.current = ac
      setPreviewLoading(true)
      const q = new URLSearchParams({ department: dept, fiscalYear: fy })
      void fetch(resolvedApiUrl(`/api/finance/budgets/next-code?${q}`), {
        credentials: 'include',
        signal: ac.signal,
      })
        .then(async (res) => {
          const data = await res.json().catch(() => null)
          if (mySeq !== previewSeqRef.current) return
          if (createFormRef.current.department.trim() !== dept || createFormRef.current.fiscalYear.trim() !== fy) return
          if (!res.ok) {
            const err = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
            const msg = typeof err.error === 'string' ? err.error : `Preview failed (${res.status})`
            throw new Error(msg)
          }
          if (data && typeof data === 'object' && 'code' in data && typeof data.code === 'string') {
            setPreviewBudgetCode(data.code)
            setPreviewError(null)
          } else {
            setPreviewBudgetCode(null)
            setPreviewError('Invalid preview response')
          }
        })
        .catch((e: unknown) => {
          if (e instanceof DOMException && e.name === 'AbortError') return
          if (mySeq !== previewSeqRef.current) return
          if (createFormRef.current.department.trim() !== dept || createFormRef.current.fiscalYear.trim() !== fy) return
          setPreviewBudgetCode(null)
          setPreviewError(e instanceof Error ? e.message : 'Could not generate code')
        })
        .finally(() => {
          if (ac.signal.aborted) return
          if (mySeq !== previewSeqRef.current) return
          setPreviewLoading(false)
        })
    }, 300)
    return () => {
      window.clearTimeout(t)
    }
  }, [createOpen, createForm.department, createForm.fiscalYear])

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return budgets.filter((b) => {
      if (sourceTab !== 'all' && b.source !== sourceTab) return false
      if (!q) return true
      return (
        b.budgetCode.toLowerCase().includes(q) ||
        b.project.toLowerCase().includes(q) ||
        b.department.toLowerCase().includes(q) ||
        b.fiscalYear.toLowerCase().includes(q)
      )
    })
  }, [budgets, searchQuery, sourceTab])

  const totals = useMemo(() => {
    const allocated = budgets.reduce((s, b) => s + b.totalAmount, 0)
    const utilized = budgets.reduce((s, b) => s + b.utilizedAmount, 0)
    const balance = budgets.reduce((s, b) => s + b.availableBalance, 0)
    return { allocated, utilized, balance, count: budgets.length }
  }, [budgets])

  const openEdit = (b: FinanceBudgetJson) => {
    setEditTarget(b)
    setEditForm({
      budgetCode: b.budgetCode,
      department: b.department,
      project: b.project,
      source: b.source,
      totalAmount: String(b.totalAmount),
      fiscalYear: b.fiscalYear,
    })
    setEditError(null)
    setEditOpen(true)
  }

  const submitCreate = async () => {
    setCreateBusy(true)
    setCreateError(null)
    const totalAmount = Number(createForm.totalAmount)
    if (!createForm.department || !createForm.project.trim()) {
      setCreateError('Department and project are required.')
      setCreateBusy(false)
      return
    }
    if (!createForm.fiscalYear.trim() || createForm.fiscalYear.trim().length < 2) {
      setCreateError('Fiscal year is required.')
      setCreateBusy(false)
      return
    }
    if (!previewBudgetCode || previewLoading) {
      setCreateError('Wait for the budget code to generate, or fix department and fiscal year.')
      setCreateBusy(false)
      return
    }
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      setCreateError('Total amount must be a positive number.')
      setCreateBusy(false)
      return
    }
    try {
      const res = await fetch(resolvedApiUrl('/api/finance/budgets'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          budgetCode: previewBudgetCode,
          department: createForm.department,
          project: createForm.project.trim(),
          source: createForm.source,
          totalAmount,
          fiscalYear: createForm.fiscalYear.trim(),
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const msg =
          data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
            ? data.error
            : `Create failed (${res.status})`
        throw new Error(msg)
      }
      setCreateOpen(false)
      setCreateForm(emptyCreateForm())
      setPreviewBudgetCode(null)
      setPreviewError(null)
      await fetchBudgets()
      invalidateDgBudgetOverview()
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setCreateBusy(false)
    }
  }

  const submitEdit = async () => {
    if (!editTarget) return
    setEditBusy(true)
    setEditError(null)
    const totalAmount = Number(editForm.totalAmount)
    if (!editForm.budgetCode.trim() || !editForm.department || !editForm.project.trim()) {
      setEditError('Budget code, department, and project are required.')
      setEditBusy(false)
      return
    }
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      setEditError('Total amount must be a positive number.')
      setEditBusy(false)
      return
    }
    try {
      const res = await fetch(resolvedApiUrl(`/api/finance/budgets/${editTarget.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          budgetCode: editForm.budgetCode.trim(),
          department: editForm.department,
          project: editForm.project.trim(),
          source: editForm.source,
          totalAmount,
          fiscalYear: editForm.fiscalYear.trim(),
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const msg =
          data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
            ? data.error
            : `Update failed (${res.status})`
        throw new Error(msg)
      }
      setEditOpen(false)
      setEditTarget(null)
      await fetchBudgets()
      invalidateDgBudgetOverview()
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setEditBusy(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      const res = await fetch(resolvedApiUrl(`/api/finance/budgets/${deleteTarget.id}`), {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => null)
        const msg =
          data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
            ? data.error
            : `Delete failed (${res.status})`
        throw new Error(msg)
      }
      setDeleteTarget(null)
      await fetchBudgets()
      invalidateDgBudgetOverview()
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Budgets</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={() => void fetchBudgets()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog
            open={createOpen}
            onOpenChange={(o) => {
              setCreateOpen(o)
              if (!o) {
                setCreateForm(emptyCreateForm())
                setCreateError(null)
                setPreviewBudgetCode(null)
                setPreviewError(null)
                setPreviewLoading(false)
                previewAbortRef.current?.abort()
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New budget line
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create budget line</DialogTitle>
                <DialogDescription>
                  Choose a department and fiscal year first. A unique programme budget code is generated for that
                  pair (e.g. BUD-HYD-2425-0001). You can adjust the code later under Edit if needed.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select
                    value={createForm.department || undefined}
                    onValueChange={(v) => setCreateForm((f) => ({ ...f, department: v }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select department — code generates next" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(departmentNames).map(([key, name]) => (
                        <SelectItem key={key} value={key}>
                          {name}
                        </SelectItem>
                      ))}
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fiscal year</Label>
                  <Input
                    value={createForm.fiscalYear}
                    onChange={(e) => setCreateForm((f) => ({ ...f, fiscalYear: e.target.value }))}
                    placeholder="2024/25"
                  />
                </div>
                <div className="space-y-2 rounded-md border border-border bg-muted/40 px-3 py-3">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Budget code (auto)
                  </Label>
                  {previewLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating…
                    </div>
                  ) : previewError ? (
                    <p className="text-sm text-destructive" role="alert">
                      {previewError}
                    </p>
                  ) : previewBudgetCode ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded bg-background px-2 py-1 font-mono text-sm font-semibold tracking-tight">
                        {previewBudgetCode}
                      </code>
                      <Badge variant="secondary" className="text-xs font-normal">
                        {departmentLabel(createForm.department)}
                      </Badge>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Select department and enter fiscal year to preview your unique code.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-project">Project / programme name</Label>
                  <Input
                    id="create-project"
                    value={createForm.project}
                    onChange={(e) => setCreateForm((f) => ({ ...f, project: e.target.value }))}
                    placeholder="Short programme title"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Funding source</Label>
                    <Select
                      value={createForm.source}
                      onValueChange={(v) =>
                        setCreateForm((f) => ({ ...f, source: v as 'donor' | 'local' }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">Local</SelectItem>
                        <SelectItem value="donor">Donor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-amount">Total amount (SLE)</Label>
                    <Input
                      id="create-amount"
                      type="number"
                      min={1}
                      step={1}
                      value={createForm.totalAmount}
                      onChange={(e) => setCreateForm((f) => ({ ...f, totalAmount: e.target.value }))}
                    />
                  </div>
                </div>
                {createError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {createError}
                  </p>
                ) : null}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createBusy}>
                  Cancel
                </Button>
                <Button
                  onClick={() => void submitCreate()}
                  disabled={
                    createBusy || previewLoading || !previewBudgetCode || !createForm.department
                  }
                >
                  {createBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loadError ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-destructive">Could not load budgets</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Budget lines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{loading ? '—' : totals.count}</span>
              <Wallet className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total allocated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '—' : formatCurrency(totals.allocated)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Utilized</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '—' : formatCurrency(totals.utilized)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '—' : formatCurrency(totals.balance)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Programme budgets</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search code, project, year..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={sourceTab} onValueChange={(v) => setSourceTab(v as typeof sourceTab)}>
            <TabsList>
              <TabsTrigger value="all">All sources</TabsTrigger>
              <TabsTrigger value="local">Local</TabsTrigger>
              <TabsTrigger value="donor">Donor</TabsTrigger>
            </TabsList>
            {(['all', 'local', 'donor'] as const).map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-4">
                {loading ? (
                  <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading budgets…
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>FY</TableHead>
                        <TableHead className="text-right">Allocated</TableHead>
                        <TableHead className="text-right">Utilized</TableHead>
                        <TableHead className="w-[140px]">Use %</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                            No budget lines match your filters.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filtered.map((b) => {
                          const pct =
                            b.totalAmount > 0 ? Math.min(100, (b.utilizedAmount / b.totalAmount) * 100) : 0
                          return (
                            <TableRow key={b.id}>
                              <TableCell className="min-w-[10rem] max-w-[14rem]">
                                <span className="block font-mono text-sm font-semibold leading-tight">
                                  {b.budgetCode}
                                </span>
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">{b.project}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{departmentLabel(b.department)}</Badge>
                              </TableCell>
                              <TableCell className="capitalize">{b.source}</TableCell>
                              <TableCell className="text-muted-foreground">{b.fiscalYear}</TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(b.totalAmount)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(b.utilizedAmount)}</TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <Progress value={pct} className="h-2" />
                                  <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(b.availableBalance)}
                              </TableCell>
                              <TableCell className="text-muted-foreground whitespace-nowrap">
                                {formatDate(new Date(b.createdAt))}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" aria-label="Row actions">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem className="gap-2" onClick={() => openEdit(b)}>
                                      <Pencil className="h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="gap-2 text-destructive focus:text-destructive"
                                      onClick={() => {
                                        setDeleteTarget(b)
                                        setDeleteError(null)
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <Dialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o)
          if (!o) {
            setEditTarget(null)
            setEditError(null)
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit budget line</DialogTitle>
            <DialogDescription>
              Update metadata or allocation. Total cannot drop below utilized amount.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-code">Budget code</Label>
                <Input
                  id="edit-code"
                  value={editForm.budgetCode}
                  onChange={(e) => setEditForm((f) => ({ ...f, budgetCode: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Fiscal year</Label>
                <Input
                  value={editForm.fiscalYear}
                  onChange={(e) => setEditForm((f) => ({ ...f, fiscalYear: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                value={editForm.department || undefined}
                onValueChange={(v) => setEditForm((f) => ({ ...f, department: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(departmentNames).map(([key, name]) => (
                    <SelectItem key={key} value={key}>
                      {name}
                    </SelectItem>
                  ))}
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-project">Project / programme name</Label>
              <Input
                id="edit-project"
                value={editForm.project}
                onChange={(e) => setEditForm((f) => ({ ...f, project: e.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Funding source</Label>
                <Select
                  value={editForm.source}
                  onValueChange={(v) =>
                    setEditForm((f) => ({ ...f, source: v as 'donor' | 'local' }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local</SelectItem>
                    <SelectItem value="donor">Donor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-amount">Total amount (SLE)</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  min={1}
                  step={1}
                  value={editForm.totalAmount}
                  onChange={(e) => setEditForm((f) => ({ ...f, totalAmount: e.target.value }))}
                />
              </div>
            </div>
            {editTarget ? (
              <p className="text-xs text-muted-foreground">
                Utilized: {formatCurrency(editTarget.utilizedAmount)} — balance must stay non‑negative.
              </p>
            ) : null}
            {editError ? (
              <p className="text-sm text-destructive" role="alert">
                {editError}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editBusy}>
              Cancel
            </Button>
            <Button onClick={() => void submitEdit()} disabled={editBusy}>
              {editBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteTarget(null)
            setDeleteError(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete budget line?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? (
                <>
                  This will remove <span className="font-mono font-medium">{deleteTarget.budgetCode}</span>.
                  Deletion is only allowed when utilization is zero and no requisitions reference this line.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError ? (
            <p className="text-sm text-destructive" role="alert">
              {deleteError}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault()
                void confirmDelete()
              }}
              disabled={deleteBusy}
            >
              {deleteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
