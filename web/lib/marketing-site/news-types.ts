export type MarketingNewsPost = {
  id: string
  slug: string
  title: string
  /** Display date, e.g. "10 Jun 2025" */
  date: string
  /** ISO 8601 — used for sorting */
  publishedAt: string
  image?: string
  excerpt: string
  bodyHtml: string
  comments: number
  published: boolean
  /** Original WordPress path, e.g. /parliament-approves-the-new-director-general-for-nwrma/ */
  legacyPath?: string
  source?: 'cms' | 'legacy'
}

export type MarketingNewsPostInput = {
  title: string
  date: string
  publishedAt?: string
  image?: string
  excerpt: string
  bodyHtml: string
  comments?: number
  published?: boolean
  slug?: string
}

export function newsPostPath(slug: string): string {
  return `/news/${slug}`
}

export function slugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function formatNewsDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
