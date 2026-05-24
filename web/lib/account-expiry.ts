const MIN_TEMP_ACCOUNT_LEAD_MS = 60 * 60 * 1000

export function parseAccountExpiresAt(raw: unknown): Date | null {
  if (raw == null || raw === '') return null
  const d = raw instanceof Date ? raw : new Date(String(raw))
  if (Number.isNaN(d.getTime())) return null
  return d
}

export function isAccountExpired(
  expiresAt: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  const d = parseAccountExpiresAt(expiresAt ?? null)
  if (!d) return false
  return now.getTime() > d.getTime()
}

export function minTemporaryAccountExpiresAt(now: Date = new Date()): Date {
  return new Date(now.getTime() + MIN_TEMP_ACCOUNT_LEAD_MS)
}

export function accountExpiryLoginMessage(expiresAt: Date): string {
  const when = expiresAt.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  return `This temporary account expired on ${when}. Contact your administrator for access.`
}
