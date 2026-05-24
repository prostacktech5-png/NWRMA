import { sendBirthdayGreetingEmail, isSmtpConfigured } from '@/lib/mail'
import { logNotification, wasNotificationSentToday } from '@/lib/hr-notification-log'

export async function notifyBirthdayGreeting(input: {
  employeeId: string
  employeeName: string
  to: string
  skipIfSentToday?: boolean
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSmtpConfigured()) {
    return { ok: false, error: 'SMTP is not configured.' }
  }
  const to = input.to.trim()
  if (!to) return { ok: false, error: 'Employee has no email address.' }

  if (input.skipIfSentToday) {
    const sent = await wasNotificationSentToday('hr_birthday', input.employeeId)
    if (sent) return { ok: false, error: 'Greeting already sent today.' }
  }

  await sendBirthdayGreetingEmail({ to, employeeName: input.employeeName })
  await logNotification({
    entityType: 'hr_birthday',
    entityId: input.employeeId,
    recipient: to,
  })
  return { ok: true }
}
