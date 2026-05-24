'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useSessionUser } from '@/components/demo-session-provider'
import { resolvedApiUrl } from '@/lib/apiBase'
import { FINANCE_REQUISITIONS_QUERY_KEY, FINANCE_SUMMARY_QUERY_KEY } from '@/lib/dgQueryKeys'
import { canDecideFinanceRequisition } from '@/lib/finance-requisition-approval-policy'
import { usesPettyCashDirectRouting } from '@/lib/finance-requisition-routing'
import { departmentNames, formatCurrency, requisitionStatusLabels } from '@/lib/mock-data'

type FinanceReqRow = {
  id: number
  title: string
  description: string
  requestedBy: string
  department: string
  amount: number
  expenseKind: string
  status: string
  approvalRoute: string | null
  createdAt: string
}

export function FinanceRequisitionSettlementQueue() {
  const { user } = useSessionUser()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: [...FINANCE_REQUISITIONS_QUERY_KEY, 'finance_review'],
    queryFn: async () => {
      const r = await fetch(resolvedApiUrl('/api/finance/requisitions?status=finance_review'), {
        credentials: 'include',
      })
      if (!r.ok) throw new Error('Failed to load settlement queue')
      return r.json() as Promise<FinanceReqRow[]>
    },
    refetchInterval: 45_000,
  })

  const mutate = useMutation({
    mutationFn: async (vars: { id: number; action: 'approve' | 'reject' }) => {
      const r = await fetch(resolvedApiUrl(`/api/finance/requisitions/${vars.id}/approve`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: vars.action,
          comment: vars.action === 'reject' ? 'Rejected at Finance settlement' : null,
        }),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? 'Request failed')
      }
      return r.json()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...FINANCE_REQUISITIONS_QUERY_KEY] })
      void queryClient.invalidateQueries({ queryKey: [...FINANCE_SUMMARY_QUERY_KEY] })
      void queryClient.invalidateQueries({ queryKey: ['dg-summary'] })
      void queryClient.invalidateQueries({ queryKey: ['dg-pending'] })
    },
  })

  const rows = query.data ?? []
  const canAct = Boolean(user && rows.some((row) => canDecideFinanceRequisition(user!, row)))

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Settlement queue</CardTitle>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading queue…
          </div>
        ) : query.isError ? (
          <p className="text-sm text-destructive">{(query.error as Error)?.message ?? 'Could not load queue.'}</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Dept</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[8.5rem] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const pettyDirect = usesPettyCashDirectRouting(row)
                  const rowCanAct = Boolean(user && canDecideFinanceRequisition(user!, row))
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs">{row.id}</TableCell>
                      <TableCell className="max-w-[14rem]">
                        <p className="truncate font-medium" title={row.title}>
                          {row.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{row.description}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{departmentNames[row.department] ?? row.department}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{formatCurrency(row.amount)}</TableCell>
                      <TableCell>
                        {pettyDirect ? (
                          <Badge variant="secondary" className="text-xs font-normal">
                            Petty (&le; 500)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs font-normal">
                            Full chain
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs">{requisitionStatusLabels[row.status] ?? row.status}</span>
                      </TableCell>
                      <TableCell className="space-x-1 text-right whitespace-nowrap">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          disabled={!rowCanAct || mutate.isPending}
                          title={!canAct ? 'Sign in as Finance staff or HoD for this approval' : undefined}
                          onClick={() =>
                            mutate.mutateAsync({ id: row.id, action: 'approve' }).catch(() => {})
                          }
                        >
                          Settle / approve
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs text-destructive hover:text-destructive"
                          disabled={!rowCanAct || mutate.isPending}
                          onClick={() =>
                            mutate.mutateAsync({ id: row.id, action: 'reject' }).catch(() => {})
                          }
                        >
                          Reject
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {user && !canAct && rows.length > 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            You are signed in as a user who cannot release funds on this queue. Sign in as Finance HoD or staff (or
            admin) to approve or reject.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
