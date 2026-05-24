/**
 * Public paths that skip login redirect.
 * Marketing SPA paths that skip login redirect (ERP routes use App Router).
 */

const PUBLIC_EXACT = new Set(['/online-forms'])

const PUBLIC_PREFIXES = ['/online-forms/']

export function isPublicSitePath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
}
