'use client'

import { useState } from 'react'
import { Download, Eye, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSessionUser } from '@/components/demo-session-provider'

export function WaterRightDocumentActions({
  applicationId,
  fileId,
  fileName,
  hasStorage,
}: {
  applicationId: string
  fileId: string
  fileName: string
  hasStorage: boolean
}) {
  const { actingUserHeaders } = useSessionUser()
  const [busy, setBusy] = useState<'view' | 'download' | null>(null)

  if (!hasStorage) {
    return (
      <span className="text-xs text-muted-foreground italic">
        Demo sample — re-submit via portal for downloadable files
      </span>
    )
  }

  const fetchFile = async (disposition: 'inline' | 'attachment') => {
    const res = await fetch(
      `/api/water-right-applications/${applicationId}/documents/${fileId}?disposition=${disposition}`,
      {
        headers: { ...actingUserHeaders },
        credentials: 'same-origin',
      }
    )
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(data.error ?? 'Could not load file.')
    }
    return res.blob()
  }

  const handleView = async () => {
    setBusy('view')
    try {
      const blob = await fetchFile('inline')
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not open file.')
    } finally {
      setBusy(null)
    }
  }

  const handleDownload = async () => {
    setBusy('download')
    try {
      const blob = await fetchFile('attachment')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not download file.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex shrink-0 gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        disabled={busy !== null}
        onClick={() => void handleView()}
      >
        {busy === 'view' ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Eye className="h-3.5 w-3.5" />
        )}
        <span className="ml-1">View</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        disabled={busy !== null}
        onClick={() => void handleDownload()}
      >
        {busy === 'download' ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        <span className="ml-1">Download</span>
      </Button>
    </div>
  )
}
