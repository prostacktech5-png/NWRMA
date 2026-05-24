'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ClipboardList,
  Megaphone,
  Scale,
  BookOpen,
  Gavel,
  MessageSquare,
  Target,
  Building2,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useSessionUser } from '@/components/demo-session-provider'
import { LRO_KEY_TASKS, LRO_MANDATE, LRO_UNITS } from '@/lib/compliance-mock-data'
import { resolvedApiUrl } from '@/lib/apiBase'

const taskIcons = {
  representation: Gavel,
  byelaws: Scale,
  corporate_communication: MessageSquare,
  compliance_planning: Target,
} as const

type DashboardStats = {
  openCases: number
  activeLegal: number
  activeComms: number
  regulationsCount: number
}

export default function ComplianceDashboardPage() {
  const { actingUserHeaders } = useSessionUser()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const res = await fetch(resolvedApiUrl('/api/compliance/dashboard'), {
          headers: actingUserHeaders,
          credentials: 'same-origin',
        })
        const data = await res.json()
        if (res.ok) setStats(data.stats as DashboardStats)
      } finally {
        setLoading(false)
      }
    })()
  }, [actingUserHeaders])

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Compliance department</p>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Legal, Regulations and Outreach
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-relaxed text-muted-foreground">{LRO_MANDATE}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open compliance cases</CardDescription>
            <CardTitle className="text-3xl">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (stats?.openCases ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Legal matters in progress</CardDescription>
            <CardTitle className="text-3xl">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (stats?.activeLegal ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Scale className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active communications</CardDescription>
            <CardTitle className="text-3xl">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (stats?.activeComms ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Megaphone className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Regulations library</CardDescription>
            <CardTitle className="text-3xl">
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                (stats?.regulationsCount ?? 0)
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BookOpen className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Key tasks</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {LRO_KEY_TASKS.map((task) => {
            const Icon = taskIcons[task.id]
            return (
              <Card key={task.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <CardTitle className="text-base">{task.title}</CardTitle>
                      <CardDescription className="mt-1">{task.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Specialised units</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {LRO_UNITS.map((unit) => (
            <Card key={unit.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{unit.title}</CardTitle>
                </div>
                <CardDescription>{unit.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-0">
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={unit.href}>Open {unit.title} unit</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/compliance/compliance-register">Compliance unit</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/compliance/legal">Legal unit</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/compliance/communications">Communications unit</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/compliance/regulations">Regulations library</Link>
        </Button>
      </div>
    </div>
  )
}
