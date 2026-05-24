'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { resolvedApiUrl } from '@/lib/apiBase'
import { formatCurrency } from '@/lib/mock-data'

export default function SuperAdminFinancePage() {
  const [summary, setSummary] = useState<{
    revenueTotal: number
    receiptCount: number
    currency: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(resolvedApiUrl('/api/super-admin/finance/summary'), {
        credentials: 'include',
      })
      const data = await res.json()
      if (res.ok) setSummary(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Finance overview</h2>
          <p className="text-sm text-muted-foreground">National revenue from license and fee receipts.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      {loading && !summary ? (
        <Loader2 className="mx-auto h-8 w-8 animate-spin" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Total revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {formatCurrency(summary?.revenueTotal ?? 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Receipt count</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{summary?.receiptCount ?? 0}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
