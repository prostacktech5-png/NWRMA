import { sendSubscriptionRenewalReminderEmail, isSmtpConfigured } from '@/lib/mail'
import { logNotification, wasNotificationSentToday } from '@/lib/hr-notification-log'
import { recordSubscriptionReminder } from '@/lib/hr-subscription-store'
import type { HrSubscription } from '@/lib/hr-types'

export async function notifySubscriptionRenewal(input: {
  subscription: HrSubscription
  to: string
  skipIfSentToday?: boolean
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSmtpConfigured()) {
    return { ok: false, error: 'SMTP is not configured.' }
  }
  const to = input.to.trim()
  if (!to) return { ok: false, error: 'No recipient email.' }

  if (input.skipIfSentToday) {
    const sent = await wasNotificationSentToday('hr_subscription', input.subscription.id)
    if (sent) return { ok: false, error: 'Reminder already sent today.' }
  }

  const daysLeft = Math.max(
    0,
    Math.ceil((input.subscription.expiresAt.getTime() - Date.now()) / 86_400_000)
  )
  await sendSubscriptionRenewalReminderEmail({
    to,
    subscriptionName: input.subscription.name,
    vendor: input.subscription.vendor,
    expiresAt: input.subscription.expiresAt.toISOString().slice(0, 10),
    daysLeft,
  })
  await logNotification({
    entityType: 'hr_subscription',
    entityId: input.subscription.id,
    recipient: to,
  })
  await recordSubscriptionReminder(input.subscription.id)
  return { ok: true }
}
