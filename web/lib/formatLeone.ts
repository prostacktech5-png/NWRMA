import { formatNLe as formatNLeBase } from '@/lib/mock-data'

export const formatNLe = formatNLeBase

/** Compact currency for DG KPI tiles (deterministic for SSR — avoid `en-SL` currency symbol drift). */
export function formatNLeCompact(amount: number): string {
  try {
    const compact = new Intl.NumberFormat('en-GB', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount)
    return `SLE ${compact}`
  } catch {
    return formatNLeBase(amount)
  }
}
