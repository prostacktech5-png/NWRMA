'use client'

import { useState } from 'react'
import { Download, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ComplianceDeptHeader } from '@/components/compliance/compliance-dept-header'
import { useSessionUser } from '@/components/demo-session-provider'
import { resolvedApiUrl } from '@/lib/apiBase'

type Summary = {
  fiscalYear: string
  generatedAt: string
  openCases: number
  activeLegal: number
  activeComms: number
  regulationsCount: number
  casesByStatus: Record<string, number>
  mattersByStatus: Record<string, number>
  campaignsByStatus: Record<string, number>
}

function toCsv(summary: Summary): string {
  const lines = [
    'LRO Department Activity Summary',
    `Fiscal year,${summary.fiscalYear}`,
    `Generated,${summary.generatedAt}`,
    '',
    'Metric,Count',
    `Open compliance cases,${summary.openCases}`,
    `Legal matters (draft/active),${summary.activeLegal}`,
    `Active communications,${summary.activeComms}`,
    `Regulations in library,${summary.regulationsCount}`,
    '',
    'Compliance cases by status',
    ...Object.entries(summary.casesByStatus).map(([k, v]) => `${k},${v}`),
    '',
    'Legal matters by status',
    ...Object.entries(summary.mattersByStatus).map(([k, v]) => `${k},${v}`),
    '',
    'Campaigns by status',
    ...Object.entries(summary.campaignsByStatus).map(([k, v]) => `${k},${v}`),
  ]
  return lines.join('\n')
}

export default function ComplianceReportsPage() {
  const { actingUserHeaders } = useSessionUser()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(resolvedApiUrl('/api/compliance/reports/summary'), {
        headers: actingUserHeaders,
        credentials: 'same-origin',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Failed')
      setSummary(data as Summary)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  function downloadCsv() {
    if (!summary) return
    const blob = new Blob([toCsv(summary)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lro-summary-${summary.fiscalYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <ComplianceDeptHeader
        title="Reports"
        subtitle="Department activity summaries across the Compliance, Legal, and Communications units, plus cross-cutting regulations and outreach metrics."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Activity reports
          </CardTitle>
          <CardDescription>
            Generate a snapshot of cases, legal matters, campaigns, and regulations for the current
            fiscal year.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void generate()} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Generate summary
            </Button>
            {summary ? (
              <Button variant="outline" onClick={downloadCsv} className="gap-2">
                <Download className="h-4 w-4" />
                Download CSV
              </Button>
            ) : null}
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {summary ? (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <p className="font-medium">FY {summary.fiscalYear} — generated {new Date(summary.generatedAt).toLocaleString()}</p>
              <ul className="mt-2 list-inside list-disc text-muted-foreground">
                <li>Open compliance cases: {summary.openCases}</li>
                <li>Legal matters in progress: {summary.activeLegal}</li>
                <li>Active communications: {summary.activeComms}</li>
                <li>Regulations catalogue: {summary.regulationsCount}</li>
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Click Generate summary to load live counts from the compliance database.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
