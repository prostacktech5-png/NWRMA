'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle, Loader2, XCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/StatusBadge'
import { resolvedApiUrl } from '@/lib/apiBase'
import type { User } from '@/lib/types'

type HodLeaveRow = {
  id: string
  employeeName: string
  type: string
  start: string
  end: string
  days: number
  reason: string
  status: string
}

export function HodLeaveApprovalQueue({
  viewer,
  onDecided,
}: {
  viewer: User
  onDecided?: () => void
}) {
  const eligible = viewer.role === 'hod' && viewer.department === 'hr'
  const [rows, setRows] = useState<HodLeaveRow[]>([])
  const [loading, setLoading] = useState(eligible)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!eligible) return
    setErr(null)
    setLoading(true)
    try {
      const r = await fetch(resolvedApiUrl('/api/hr/pending-leaves'), { credentials: 'include' })
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error ?? `HTTP ${r.status}`)
      }
      const json = (await r.json()) as { leaves?: HodLeaveRow[] }
      setRows(json.leaves ?? [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load leave queue.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [eligible])

  useEffect(() => {
    void load()
  }, [load])

  const decide = async (id: string, action: 'approve' | 'reject') => {
    setBusyId(id)
    setErr(null)
    try {
      const r = await fetch(resolvedApiUrl(`/api/hr/leave/${encodeURIComponent(id)}/hod-decision`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      })
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error ?? `HTTP ${r.status}`)
      }
      await load()
      onDecided?.()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Request failed.')
    } finally {
      setBusyId(null)
    }
  }

  if (!eligible) return null

  return (
    <Card className="border-amber-200/80 bg-amber-50/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Leave — HoD gate</CardTitle>
        <CardDescription>
          Requests must pass Human Resources HoD approval before they are visible to the Director General.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {err ? (
          <p className="text-sm text-red-700" role="alert">
            {err}
          </p>
        ) : null}
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin shrink-0" />
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leave requests awaiting your review.</p>
        ) : (
          <ul className="divide-y divide-amber-200/60 rounded-lg border border-amber-200/60 bg-white">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold">{row.employeeName}</p>
                  <p className="text-sm text-muted-foreground">
                    {row.type.replace(/_/g, ' ')} · {row.days} day(s) · {row.start} to {row.end}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-2">{row.reason}</p>
                  <StatusBadge status={row.status} />
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                    disabled={busyId != null}
                    onClick={() => void decide(row.id, 'approve')}
                  >
                    {busyId === row.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Forward to DG
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 border-red-300 text-red-700 hover:bg-red-50"
                    disabled={busyId != null}
                    onClick={() => void decide(row.id, 'reject')}
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
