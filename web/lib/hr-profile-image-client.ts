import { resolvedApiUrl } from '@/lib/apiBase'

/** Resolve stored profile URL for img / Avatar (same-origin API or legacy URL). */
export function resolveHrEmployeePhotoSrc(
  employeeId: string,
  profileImageUrl: string | null | undefined
): string | undefined {
  const url = profileImageUrl?.trim()
  if (url?.startsWith('/api/')) return resolvedApiUrl(url)
  if (
    url?.startsWith('http://') ||
    url?.startsWith('https://') ||
    url?.startsWith('data:image/')
  ) {
    return url
  }
  return undefined
}
