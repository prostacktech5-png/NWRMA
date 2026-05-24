'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { resolvedApiUrl } from '@/lib/apiBase'

export function PlatformGeneralSettings() {
  const [json, setJson] = useState('{}')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(resolvedApiUrl('/api/super-admin/settings'), {
        credentials: 'include',
      })
      const data = await res.json()
      if (res.ok) setJson(JSON.stringify(data.settings ?? {}, null, 2))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const save = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const settings = JSON.parse(json) as Record<string, unknown>
      const res = await fetch(resolvedApiUrl('/api/super-admin/settings'), {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      })
      if (!res.ok) throw new Error('Save failed')
      setMessage('Settings saved.')
    } catch {
      setMessage('Invalid JSON or save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>platform_settings</CardTitle>
        <CardDescription>Edit JSON and save to merge keys.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin" />
        ) : (
          <>
            <Textarea
              className="min-h-[320px] font-mono text-xs"
              value={json}
              onChange={(e) => setJson(e.target.value)}
            />
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save settings
            </Button>
            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
