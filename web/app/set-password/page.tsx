'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BrandingLogoPrimary } from '@/components/branding-logo'
import { useAppBranding } from '@/components/app-branding-provider'

function SetPasswordInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')?.trim() ?? ''
  const { branding } = useAppBranding()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [inviteMeta, setInviteMeta] = useState<{ fullName: string; email: string } | null>(null)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) {
      setVerifyError('Missing invitation token. Open the link from your email.')
      setChecking(false)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/auth/invite-verify?token=${encodeURIComponent(token)}`)
        const data = (await res.json()) as { valid?: boolean; error?: string; fullName?: string; email?: string }
        if (cancelled) return
        if (!res.ok || !data.valid) {
          setVerifyError(data.error ?? 'This invitation link is invalid or has expired.')
          setInviteMeta(null)
        } else {
          setInviteMeta({ fullName: data.fullName ?? '', email: data.email ?? '' })
        }
      } catch {
        if (!cancelled) setVerifyError('Could not verify the invitation. Try again later.')
      } finally {
        if (!cancelled) setChecking(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    if (password.length < 6) {
      setSubmitError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setSubmitError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const raw = await res.text()
      let data: { error?: string; hint?: string } = {}
      if (raw) {
        try {
          data = JSON.parse(raw) as { error?: string; hint?: string }
        } catch {
          setSubmitError(`Could not save password (server returned HTTP ${res.status}).`)
          return
        }
      }
      if (!res.ok) {
        const hint = typeof data.hint === 'string' && data.hint ? ` ${data.hint}` : ''
        setSubmitError((data.error ?? 'Could not save password.') + hint)
        return
      }
      setDone(true)
      setTimeout(() => router.push('/login'), 2500)
    } catch {
      setSubmitError('Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-10">
      <div className="mb-8 flex items-center gap-3">
        <BrandingLogoPrimary branding={branding} />
        <div>
          <h1 className="text-2xl font-bold text-foreground">{branding.appName}</h1>
          <p className="text-sm text-muted-foreground">{branding.slogan}</p>
        </div>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set your password</CardTitle>
          <CardDescription>
            Choose a password to activate your account for {branding.appName}.
          </CardDescription>
        </CardHeader>
        {checking ? (
          <CardContent className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        ) : verifyError ? (
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{verifyError}</AlertDescription>
            </Alert>
            <Button asChild variant="outline" className="mt-4 w-full">
              <Link href="/login">Back to sign in</Link>
            </Button>
          </CardContent>
        ) : done ? (
          <CardContent>
            <Alert>
              <AlertDescription>
                Your password is saved. Redirecting to sign in…
              </AlertDescription>
            </Alert>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {inviteMeta && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{inviteMeta.fullName}</span>
                  <br />
                  {inviteMeta.email}
                </p>
              )}
              {submitError && (
                <Alert variant="destructive">
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="pw">New password</Label>
                <Input
                  id="pw"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw2">Confirm password</Label>
                <Input
                  id="pw2"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save password'
                )}
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link href="/login">Cancel</Link>
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  )
}

export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-muted/30">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SetPasswordInner />
    </Suspense>
  )
}
