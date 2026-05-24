'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAppBranding } from '@/components/app-branding-provider'
import { BrandingLogoPrimary } from '@/components/branding-logo'
import { useDemoSession } from '@/components/demo-session-provider'
import { cn } from '@/lib/utils'
import type { User } from '@/lib/types'
import { getPostLoginPath } from '@/lib/post-login-redirect'

const AGENCY_FULL_NAME = 'National Water Resources Management Agency'

type LoginApiUser = {
  id: string
  email: string
  name: string
  role: User['role']
  department: User['department']
  status: User['status']
  createdAt: string
}

async function parseLoginResponse(res: Response): Promise<{
  ok: boolean
  data: {
    error?: string
    user?: LoginApiUser
    platformRoles?: string[]
    canAccessSuperAdmin?: boolean
  }
}> {
  const text = await res.text()
  if (!text.trim()) {
    return { ok: false, data: { error: loginErrorForStatus(res.status) } }
  }
  try {
    const data = JSON.parse(text) as {
      error?: string
      user?: LoginApiUser
      platformRoles?: string[]
      canAccessSuperAdmin?: boolean
    }
    if (!res.ok) {
      return { ok: false, data: { error: data.error ?? loginErrorForStatus(res.status) } }
    }
    return { ok: true, data }
  } catch {
    return { ok: false, data: { error: loginErrorForStatus(res.status) } }
  }
}

function loginErrorForStatus(status: number): string {
  if (status === 401) return 'Invalid email or password'
  if (status === 403) return 'This account cannot sign in. Contact an administrator.'
  if (status === 503) return 'Database is busy. Wait a moment and try again.'
  if (status >= 500) return 'Server error. Try again in a moment.'
  return 'Sign in failed'
}

const inputShellClass =
  'h-11 rounded-lg border-slate-200/90 bg-[#eff6ff] text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:border-sky-300 focus-visible:bg-white focus-visible:ring-sky-200/60 md:text-sm'

type SetupStatus =
  | { state: 'loading' }
  | { state: 'ok'; userCount: number }
  | { state: 'problem'; message: string }

export default function LoginPage() {
  const router = useRouter()
  const { branding } = useAppBranding()
  const { setSessionFromLogin } = useDemoSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [setupStatus, setSetupStatus] = useState<SetupStatus>({ state: 'loading' })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/auth/setup-status', { cache: 'no-store' })
        const data = (await res.json()) as {
          ok?: boolean
          userCount?: number
          error?: string
          hint?: string
        }
        if (cancelled) return
        if (!res.ok) {
          const msg =
            typeof data.hint === 'string' && data.hint
              ? `${data.error ?? 'Database not ready.'} ${data.hint}`
              : (data.error ?? `Server returned ${res.status}. Check DATABASE_URL in .env.local.`)
          setSetupStatus({ state: 'problem', message: msg })
          return
        }
        if (typeof data.userCount === 'number') {
          setSetupStatus({ state: 'ok', userCount: data.userCount })
          return
        }
        setSetupStatus({ state: 'problem', message: 'Unexpected setup response from server.' })
      } catch {
        if (!cancelled) {
          setSetupStatus({
            state: 'problem',
            message: 'Could not reach the server to verify the database.',
          })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const { ok, data } = await parseLoginResponse(res)

      if (!ok || !data.user) {
        setError(data.error ?? 'Sign in failed')
        setLoading(false)
        return
      }

      const u: User = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
        department: data.user.department,
        status: data.user.status,
        createdAt: new Date(data.user.createdAt),
      }
      setSessionFromLogin({
        user: u,
        platformRoles: Array.isArray(data.platformRoles)
          ? data.platformRoles.filter((r): r is string => typeof r === 'string')
          : [],
        canAccessSuperAdmin: data.canAccessSuperAdmin === true,
      })
      const params =
        typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
      const rawNext = params?.get('next')?.trim()
      const dest =
        rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//')
          ? rawNext
          : getPostLoginPath(u)
      router.push(dest)
    } catch {
      setError('Cannot reach the server. Check that the app is running and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8fafc] px-4 py-14">
      <div className="flex w-full max-w-md flex-col items-center">
        <p className="mb-6 w-full text-left">
          <Link
            href="/"
            className="text-sm font-medium text-sky-700 underline-offset-2 hover:text-sky-900 hover:underline"
          >
            ← Back to NWRMA website
          </Link>
        </p>
        <div className="mb-10 flex flex-col items-center text-center">
          <BrandingLogoPrimary
            branding={branding}
            boxClassName="mb-5 h-20 w-20 rounded-full border border-slate-200/80 bg-white p-1.5 shadow-sm ring-2 ring-white"
          />
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">{branding.appName}</h1>
          <p className="mt-1.5 text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">
            {branding.slogan}
          </p>
          <p className="mt-2 max-w-xs text-xs leading-relaxed text-slate-500 sm:max-w-md">
            {AGENCY_FULL_NAME}
          </p>
        </div>

        <Card className="w-full border border-slate-200/90 bg-white shadow-md shadow-slate-200/50">
          <CardHeader className="space-y-0 px-6 pb-0 pt-6 text-left">
            <CardTitle className="text-lg font-semibold text-slate-950">
              Sign in to your account
            </CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5 px-6 pb-2 pt-5">
              {setupStatus.state === 'problem' ? (
                <Alert variant="destructive">
                  <AlertDescription className="text-sm">{setupStatus.message}</AlertDescription>
                </Alert>
              ) : null}
              {setupStatus.state === 'ok' && setupStatus.userCount === 0 ? (
                <Alert>
                  <AlertDescription className="space-y-2 text-sm text-slate-700">
                    <p className="font-medium text-slate-900">No users in the database yet</p>
                    <p>
                      Sign-in needs at least one row in the <code className="text-xs">User</code>{' '}
                      table (Supabase → SQL Editor or Table Editor). Use a{' '}
                      <code className="text-xs">passwordHash</code> from bcrypt (e.g. Node:{' '}
                      <code className="text-xs">bcrypt.hashSync(&apos;YourPassword&apos;, 12)</code>
                      ).
                    </p>
                    <p>
                      Optional disposable demo: <code className="text-xs">POST /api/admin/seed-database</code>{' '}
                      with header <code className="text-xs">x-seed-secret</code> matching{' '}
                      <code className="text-xs">SEED_SECRET</code> in <code className="text-xs">.env.local</code>{' '}
                      (not for production UAT).
                    </p>
                    <p className="text-xs text-slate-600">
                      After the first admin exists: <strong>Settings → Users</strong> lets an admin invite{' '}
                      <strong>HODs only</strong>; each HOD invites <strong>staff</strong> in their department.
                      Roles like <strong>DG</strong> are added in the database, not via the invite API.
                    </p>
                  </AlertDescription>
                </Alert>
              ) : null}
              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium text-slate-500">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@nwrma.gov.sl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className={inputShellClass}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="password" className="text-xs font-medium text-slate-500">
                    Password
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className={cn(inputShellClass, 'pr-11')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-11 w-11 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-slate-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-slate-400" />
                    )}
                    <span className="sr-only">
                      {showPassword ? 'Hide password' : 'Show password'}
                    </span>
                  </Button>
                </div>
              </div>
            </CardContent>
            <div className="px-6 pb-6 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#22c55e] text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#16a34a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </div>
          </form>
        </Card>

        <p className="mt-8 max-w-sm text-center text-[0.65rem] leading-snug text-slate-400">
          Government use only — unauthorized access is prohibited
        </p>
      </div>
    </div>
  )
}
