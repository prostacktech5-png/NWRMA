'use client'

import { useState } from 'react'
import { HardDrive, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { resolvedApiUrl } from '@/lib/apiBase'

export default function SuperAdminBackupPage() {
  const [busy, setBusy] = useState(false)
  const [lastRun, setLastRun] = useState<string | null>(null)

  const runBackup = async () => {
    setBusy(true)
    try {
      const res = await fetch(resolvedApiUrl('/api/super-admin/backup/run'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupType: 'manual' }),
      })
      const data = await res.json()
      if (res.ok) setLastRun(data.id ?? null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Backup &amp; recovery</h2>
        <p className="text-sm text-muted-foreground">Trigger manual database backup runs.</p>
      </div>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Manual backup
          </CardTitle>
          <CardDescription>Creates a backup_runs record and audit log entry.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={() => void runBackup()} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Run backup now
          </Button>
          {lastRun ? (
            <p className="text-sm text-muted-foreground">
              Last run id: <span className="font-mono">{lastRun}</span>
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
