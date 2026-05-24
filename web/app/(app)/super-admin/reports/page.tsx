'use client'

import { useState } from 'react'
import { FileBarChart, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { resolvedApiUrl } from '@/lib/apiBase'

export default function SuperAdminReportsPage() {
  const [reportType, setReportType] = useState('platform_summary')
  const [busy, setBusy] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)

  const queue = async () => {
    setBusy(true)
    setJobId(null)
    try {
      const res = await fetch(resolvedApiUrl('/api/super-admin/reports'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType }),
      })
      const data = await res.json()
      if (res.ok) setJobId(data.id ?? null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Reports</h2>
        <p className="text-sm text-muted-foreground">Queue export and compliance report jobs.</p>
      </div>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileBarChart className="h-5 w-5" />
            New report job
          </CardTitle>
          <CardDescription>Jobs run asynchronously and appear in report_jobs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Report type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="platform_summary">Platform summary</SelectItem>
                <SelectItem value="license_compliance">License compliance</SelectItem>
                <SelectItem value="borehole_registry">Borehole registry</SelectItem>
                <SelectItem value="audit_export">Audit export</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => void queue()} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Queue report
          </Button>
          {jobId ? (
            <p className="text-sm text-muted-foreground">
              Job queued: <span className="font-mono">{jobId}</span>
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
