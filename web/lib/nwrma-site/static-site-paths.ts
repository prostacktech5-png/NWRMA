/** Paths handled by Next.js App Router — never rewritten to static HTML. */
export const ERP_ROUTE_PREFIXES = [
  '/online-forms',
  '/login',
  '/forgot-password',
  '/set-password',
  '/dashboard',
  '/hydrological',
  '/boreholes',
  '/compliance',
  '/finance',
  '/hr',
  '/dg',
  '/water-quality',
  '/settings',
  '/super-admin',
  '/api',
  '/_next',
  '/wp-content',
  '/wp-includes',
] as const

export function isErpOrReservedPath(pathname: string): boolean {
  return ERP_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

/** Public marketing pages served by App Router `(marketing)` — no login required. */
export function isMarketingPath(pathname: string): boolean {
  if (isErpOrReservedPath(pathname)) return false
  const last = pathname.split('/').pop() ?? ''
  if (last.includes('.')) return false
  return true
}
