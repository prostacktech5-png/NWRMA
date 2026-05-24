import { tryRespondWithDbSetupHint } from '@/lib/db'
import { isBirthdayToday } from '@/lib/hr-birthday-utils'
import { notifyBirthdayGreeting } from '@/lib/hr-birthday-notify'
import { notifySubscriptionRenewal } from '@/lib/hr-subscription-notify'
import { listHrEmployees } from '@/lib/hr-employee-store'
import { listHrSubscriptions } from '@/lib/hr-subscription-store'
import { getSmtpConfig, isSmtpConfigured } from '@/lib/mail'

function checkCronSecret(req: Request): boolean {
  const secret = process.env.HR_CRON_SECRET?.trim()
  if (!secret) return false
  const header = req.headers.get('x-hr-cron-secret') ?? req.headers.get('authorization')
  if (!header) return false
  const token = header.startsWith('Bearer ') ? header.slice(7) : header
  return token === secret
}

export async function POST(req: Request) {
  return tryRespondWithDbSetupHint(async () => {
    if (!checkCronSecret(req)) {
      return Response.json({ error: 'Unauthorized.' }, { status: 401 })
    }
    if (!isSmtpConfigured()) {
      return Response.json({ error: 'SMTP not configured.', sent: { birthdays: 0, subscriptions: 0 } })
    }

    const hrEmail = getSmtpConfig()?.user ?? ''
    let birthdaysSent = 0
    let subscriptionsSent = 0
    const errors: string[] = []

    const employees = await listHrEmployees()
    const now = new Date()
    for (const emp of employees) {
      if (!emp.dateOfBirth || !emp.email.trim()) continue
      if (!isBirthdayToday(emp.dateOfBirth, now)) continue
      const result = await notifyBirthdayGreeting({
        employeeId: emp.id,
        employeeName: emp.fullName,
        to: emp.email,
        skipIfSentToday: true,
      })
      if (result.ok) birthdaysSent++
      else if (result.error !== 'Greeting already sent today.') errors.push(result.error)
    }

    const subs = await listHrSubscriptions()
    for (const sub of subs) {
      if (sub.status !== 'active' || !hrEmail) continue
      const daysLeft = Math.ceil((sub.expiresAt.getTime() - now.getTime()) / 86_400_000)
      if (daysLeft < 0 || daysLeft > sub.reminderDays) continue
      const result = await notifySubscriptionRenewal({
        subscription: sub,
        to: hrEmail,
        skipIfSentToday: true,
      })
      if (result.ok) subscriptionsSent++
      else if (result.error !== 'Reminder already sent today.') errors.push(result.error)
    }

    return Response.json({
      ok: true,
      sent: { birthdays: birthdaysSent, subscriptions: subscriptionsSent },
      errors: errors.length ? errors : undefined,
    })
  })
}
