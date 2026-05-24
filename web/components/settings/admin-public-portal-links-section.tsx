'use client'

import { useCallback, useEffect, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Link2, Copy } from 'lucide-react'
import { useSessionUser } from '@/components/demo-session-provider'

type PublicPortalsPayload = {
  staffLink: { configured: boolean; updatedAt: string | null }
  perDiemLink: { configured: boolean; updatedAt: string | null }
  schemaMissing?: boolean
  hint?: string
}

export function AdminPublicPortalLinksSection() {
  const { actingUserHeaders } = useSessionUser()
  const [data, setData] = useState<PublicPortalsPayload | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [actionErr, setActionErr] = useState<string | null>(null)
  const [rotatingStaff, setRotatingStaff] = useState(false)
  const [rotatingPerDiem, setRotatingPerDiem] = useState(false)
  const [newStaffUrl, setNewStaffUrl] = useState<string | null>(null)
  const [newPerDiemUrl, setNewPerDiemUrl] = useState<string | null>(null)
  const [copyMsg, setCopyMsg] = useState<string | null>(null)

  const reloadPortals = useCallback(async () => {
    setLoadErr(null)
    try {
      const r = await fetch('/api/hydrological/settings/public-portals', {
        headers: { ...actingUserHeaders },
      })
      const body = (await r.json().catch(() => ({}))) as { error?: string } & Partial<PublicPortalsPayload>
      if (!r.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Could not load portal settings')
      setData(body as PublicPortalsPayload)
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Could not load portal settings')
    }
  }, [actingUserHeaders])

  useEffect(() => {
    void reloadPortals()
  }, [reloadPortals])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') void reloadPortals()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [reloadPortals])

  async function rotateStaffLink() {
    if (
      !window.confirm(
        'Generate a new procurement / petty-cash link? The old URL stops working immediately.',
      )
    )
      return
    setRotatingStaff(true)
    setNewStaffUrl(null)
    setActionErr(null)
    try {
      const r = await fetch('/api/hydrological/settings/public-requisition-link/rotate', {
        method: 'POST',
        headers: { ...actingUserHeaders },
      })
      const body = (await r.json().catch(() => ({}))) as { error?: string; path?: string }
      if (!r.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Could not create link')
      const path = typeof body.path === 'string' ? body.path : ''
      setNewStaffUrl(`${window.location.origin}${path}`)
      await reloadPortals()
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setRotatingStaff(false)
    }
  }

  async function rotatePerDiemLink() {
    if (!window.confirm('Generate a new per-diem link? The old URL stops working immediately.')) return
    setRotatingPerDiem(true)
    setNewPerDiemUrl(null)
    setActionErr(null)
    try {
      const r = await fetch('/api/hydrological/settings/public-per-diem-link/rotate', {
        method: 'POST',
        headers: { ...actingUserHeaders },
      })
      const body = (await r.json().catch(() => ({}))) as { error?: string; path?: string }
      if (!r.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Could not create link')
      const path = typeof body.path === 'string' ? body.path : ''
      setNewPerDiemUrl(`${window.location.origin}${path}`)
      await reloadPortals()
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setRotatingPerDiem(false)
    }
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopyMsg('Copied to clipboard.')
      setTimeout(() => setCopyMsg(null), 2500)
    } catch {
      setCopyMsg('Copy manually from the box.')
    }
  }

  return (
    <section className="bg-card space-y-8 rounded-xl border p-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Link2 className="text-muted-foreground h-5 w-5" aria-hidden />
          Public National Water Resources Management Agency request form URLs
        </h2>
      </div>

      {data?.schemaMissing && data.hint ? (
        <Alert className="border-amber-500/40 bg-amber-50/80 dark:bg-amber-950/25">
          <AlertTitle className="text-amber-950 dark:text-amber-100">Database tables not applied yet</AlertTitle>
          <AlertDescription className="text-amber-900/90 text-sm dark:text-amber-100/90">{data.hint}</AlertDescription>
        </Alert>
      ) : null}

      {loadErr && !data && <p className="text-destructive text-sm">{loadErr}</p>}

      {data && (
        <>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Procurement / petty cash — public link</h3>
            <p className="text-muted-foreground text-xs">
              Status:{' '}
              <strong>
                {data.staffLink.configured ? 'Link active (generate new to see URL)' : 'No link yet'}
              </strong>
              {data.staffLink.updatedAt && (
                <span className="block">
                  Last rotated:{' '}
                  {new Date(data.staffLink.updatedAt).toLocaleString('en-GB', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
              )}
            </p>
            <button
              type="button"
              data-testid="button-rotate-hydro-public-link"
              disabled={rotatingStaff || Boolean(data.schemaMissing)}
              onClick={() => void rotateStaffLink()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {rotatingStaff
                ? 'Working…'
                : data.staffLink.configured
                  ? 'Generate new link (revoke old)'
                  : 'Generate link'}
            </button>
            {newStaffUrl && (
              <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 dark:bg-emerald-950/30">
                <code className="block break-all text-xs">{newStaffUrl}</code>
                <button
                  type="button"
                  data-testid="button-copy-hydro-public-link"
                  onClick={() => void copyUrl(newStaffUrl)}
                  className="inline-flex items-center gap-1 text-sm font-medium text-emerald-900 dark:text-emerald-100"
                >
                  <Copy className="h-4 w-4" /> Copy URL
                </button>
              </div>
            )}
          </div>

          <div className="border-t pt-6 space-y-3">
            <h3 className="text-sm font-semibold">Per-diem — public link</h3>
            <p className="text-muted-foreground text-xs">
              Status:{' '}
              <strong>
                {data.perDiemLink.configured ? 'Link active (generate new to see URL)' : 'No link yet'}
              </strong>
              {data.perDiemLink.updatedAt && (
                <span className="block">
                  Last rotated:{' '}
                  {new Date(data.perDiemLink.updatedAt).toLocaleString('en-GB', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
              )}
            </p>
            <button
              type="button"
              data-testid="button-rotate-hydro-per-diem-link"
              disabled={rotatingPerDiem || Boolean(data.schemaMissing)}
              onClick={() => void rotatePerDiemLink()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {rotatingPerDiem
                ? 'Working…'
                : data.perDiemLink.configured
                  ? 'Generate new per-diem link'
                  : 'Generate per-diem link'}
            </button>
            {newPerDiemUrl && (
              <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 dark:bg-emerald-950/30">
                <code className="block break-all text-xs">{newPerDiemUrl}</code>
                <button
                  type="button"
                  data-testid="button-copy-hydro-per-diem-link"
                  onClick={() => void copyUrl(newPerDiemUrl)}
                  className="inline-flex items-center gap-1 text-sm font-medium text-emerald-900 dark:text-emerald-100"
                >
                  <Copy className="h-4 w-4" /> Copy URL
                </button>
              </div>
            )}
          </div>

          {actionErr && <p className="text-destructive text-sm">{actionErr}</p>}
          {copyMsg && <p className="text-muted-foreground text-xs">{copyMsg}</p>}
        </>
      )}
    </section>
  )
}
