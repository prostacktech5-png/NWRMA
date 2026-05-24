'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  Cake,
  Calendar,
  CreditCard,
  Loader2,
  Package,
  Users,
  Wallet,
  BellRing,
  ClipboardCheck,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { resolvedApiUrl } from '@/lib/apiBase'
import { useSessionUser } from '@/components/demo-session-provider'

type Stats = {
  totalEmployees: number
  activeEmployees: number
  onLeaveCount: number
  assetsTotal: number
  assetsAssigned: number
  pendingLeave: number
  birthdaysThisWeek: number
  warrantyExpiringSoon: number
  payrollPendingApproval: number
  subscriptionsExpiringSoon: number
}

export default function HrDashboardPage() {
  const { actingUserHeaders } = useSessionUser()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(resolvedApiUrl('/api/hr/dashboard'), {
          headers: { ...actingUserHeaders },
          credentials: 'same-origin',
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(typeof data.error === 'string' ? data.error : 'Failed to load dashboard')
        }
        setStats(data.stats as Stats)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    })()
  }, [actingUserHeaders])

  const kpis = stats
    ? [
        { title: 'Total staff', value: stats.totalEmployees, icon: Users },
        { title: 'Active', value: stats.activeEmployees, icon: Users },
        { title: 'Pending leave', value: stats.pendingLeave, icon: Calendar },
        { title: 'Assets assigned', value: stats.assetsAssigned, icon: Package },
        { title: 'Birthdays (7d)', value: stats.birthdaysThisWeek, icon: Cake },
        { title: 'Warranty expiring', value: stats.warrantyExpiringSoon, icon: Package },
        {
          title: 'Payroll pending',
          value: stats.payrollPendingApproval ?? 0,
          icon: CreditCard,
        },
        {
          title: 'Subs expiring (30d)',
          value: stats.subscriptionsExpiringSoon ?? 0,
          icon: BellRing,
        },
      ]
    : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">HR &amp; Admin</h1>
        <p className="text-muted-foreground">
          Central hub for staff, assets, leave, and departmental operations
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {stats ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kpis.map(({ title, value, icon: Icon }) => (
              <Card key={title}>
                <CardHeader className="pb-2">
                  <CardDescription>{title}</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Icon className="h-5 w-5 text-primary opacity-80" />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Leave approvals</CardTitle>
                <CardDescription>HR HoD gate before Director General</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-2xl font-bold">{stats.pendingLeave}</p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/hr/leave">Review leave queue</Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Staff directory</CardTitle>
                <CardDescription>Volunteer &amp; employee records</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <Link href="/hr/staff">
                    <Users className="h-4 w-4" />
                    Manage staff
                  </Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payroll</CardTitle>
                <CardDescription>
                  {stats.payrollPendingApproval} run(s) awaiting approval
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <Link href="/hr/payroll">
                    <CreditCard className="h-4 w-4" />
                    Payroll runs
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <Link href="/hr/subscriptions">
                    <BellRing className="h-4 w-4" />
                    Subscriptions ({stats.subscriptionsExpiringSoon} expiring)
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" asChild>
          <Link href="/hr/requisitions">
            <Wallet className="mr-2 h-4 w-4" />
            Requisitions
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/hr/subscriptions">
            <BellRing className="mr-2 h-4 w-4" />
            Subscriptions
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/hr/reports">
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Reports
          </Link>
        </Button>
      </div>
    </div>
  )
}
