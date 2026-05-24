'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Cake, Loader2, Mail } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { resolvedApiUrl } from '@/lib/apiBase'
import { useSessionUser } from '@/components/demo-session-provider'
import { formatDateValue } from '@/lib/erp-formatting'

type BirthdayJson = {
  id: string
  fullName: string
  department: string | null
  email: string
  dateOfBirth: string
  daysUntil: number
  isToday: boolean
}

export default function HrBirthdaysPage() {
  const { actingUserHeaders } = useSessionUser()
  const [birthdays, setBirthdays] = useState<BirthdayJson[]>([])
  const [smtpConfigured, setSmtpConfigured] = useState(true)
  const [loading, setLoading] = useState(true)
  const [sendingId, setSendingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(resolvedApiUrl('/api/hr/birthdays?days=30'), {
        headers: { ...actingUserHeaders },
        credentials: 'same-origin',
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setBirthdays((data.birthdays ?? []) as BirthdayJson[])
        setSmtpConfigured(data.smtpConfigured !== false)
      }
    } finally {
      setLoading(false)
    }
  }, [actingUserHeaders])

  useEffect(() => {
    void load()
  }, [load])

  const { today, thisWeek, later } = useMemo(() => {
    const todayList = birthdays.filter((b) => b.isToday)
    const weekList = birthdays.filter((b) => !b.isToday && b.daysUntil <= 7)
    const laterList = birthdays.filter((b) => !b.isToday && b.daysUntil > 7)
    return { today: todayList, thisWeek: weekList, later: laterList }
  }, [birthdays])

  const sendGreeting = async (id: string) => {
    setSendingId(id)
    try {
      await fetch(resolvedApiUrl(`/api/hr/birthdays/${id}/greet`), {
        method: 'POST',
        headers: { ...actingUserHeaders },
        credentials: 'same-origin',
      })
    } finally {
      setSendingId(null)
    }
  }

  const renderList = (items: BirthdayJson[], empty: string) => {
    if (items.length === 0) {
      return <p className="text-sm text-muted-foreground">{empty}</p>
    }
    return (
      <ul className="space-y-3">
        {items.map((e) => (
          <li
            key={e.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
          >
            <div>
              <p className="font-medium">{e.fullName}</p>
              <p className="text-sm text-muted-foreground">
                {formatDateValue(e.dateOfBirth)}
                {e.department ? ` · ${e.department}` : ''}
                {e.isToday ? (
                  <Badge className="ml-2" variant="default">
                    Today
                  </Badge>
                ) : (
                  <span className="ml-2">in {e.daysUntil} day(s)</span>
                )}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={!smtpConfigured || !e.email.trim() || sendingId === e.id}
              onClick={() => void sendGreeting(e.id)}
            >
              {sendingId === e.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Mail className="mr-1 h-4 w-4" />
                  Send greeting
                </>
              )}
            </Button>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Birthday tracker</h1>
        <p className="text-muted-foreground">
          Upcoming birthdays from staff records — email greetings (SMS/WhatsApp not configured).
        </p>
      </div>

      {!smtpConfigured && (
        <Alert>
          <AlertTitle>Email not configured</AlertTitle>
          <AlertDescription>
            Set SMTP_HOST, SMTP_USER, and SMTP_PASS in your environment to send birthday greetings.
            Daily automation uses <code className="text-xs">POST /api/hr/cron/daily</code> with{' '}
            <code className="text-xs">HR_CRON_SECRET</code>.
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-dashed">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Ensure staff have a <strong>date of birth</strong> and email on{' '}
          <Link href="/hr/staff" className="text-primary underline">
            Staff &amp; Volunteers
          </Link>
          . Automated morning emails run via the cron endpoint when SMTP is enabled.
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cake className="h-5 w-5" />
            Today ({today.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            renderList(today, 'No birthdays today.')
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>This week ({thisWeek.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? null : renderList(thisWeek, 'No birthdays this week (excluding today).')}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Later — next 30 days ({later.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? null : renderList(later, 'No further birthdays in the next 30 days.')}
        </CardContent>
      </Card>
    </div>
  )
}
