/**
 * Resolves API URLs for client fetch. If `NEXT_PUBLIC_API_BASE_URL` is set, it is prepended;
 * otherwise same-origin relative paths are used (Next.js default).
 */
export function resolvedApiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  const base = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_BASE_URL : undefined
  if (base && base.length > 0) {
    return `${base.replace(/\/$/, '')}${normalized}`
  }
  return normalized
}
