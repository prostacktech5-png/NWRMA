import { loadUserPlatformRoles } from '@/lib/db/rbac-persistence'
import { isOrgWideRole } from '@/lib/department-scope'
import type { ErpReferencePayload } from '@/lib/erp-reference-types'
import {
  buildPaymentIntakeQueue,
  paymentIntakeMetrics,
  type PaymentIntakeQueueItem,
} from '@/lib/online-form-payment-intake'
import type { User } from '@/lib/types'

export type { PaymentIntakeQueueItem as BankReceiptValidationQueueItem }

export function canAccessBankReceiptValidationDesk(
  user: User,
  opts?: { platformRoles?: readonly string[] }
): boolean {
  if (opts?.platformRoles?.includes('super_admin')) return true
  if (user.role === 'admin' || isOrgWideRole(user)) return true
  return user.department === 'financial'
}

export async function canAccessBankReceiptValidationDeskAsync(user: User): Promise<boolean> {
  if (canAccessBankReceiptValidationDesk(user)) return true
  const platformRoles = await loadUserPlatformRoles(user.id)
  return canAccessBankReceiptValidationDesk(user, { platformRoles })
}

export function buildBankReceiptValidationQueue(
  payload: ErpReferencePayload
): PaymentIntakeQueueItem[] {
  return buildPaymentIntakeQueue(payload)
}

export function bankReceiptValidationMetrics(items: PaymentIntakeQueueItem[]) {
  return paymentIntakeMetrics(items)
}

export function findBankReceiptQueueItem(
  payload: ErpReferencePayload,
  intakeId: string
): PaymentIntakeQueueItem | null {
  return buildPaymentIntakeQueue(payload).find((i) => i.intakeId === intakeId) ?? null
}
