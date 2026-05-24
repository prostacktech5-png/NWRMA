import 'server-only'

import { readFile } from 'fs/promises'
import path from 'path'
import type { MarketingNewsPost } from '@/lib/marketing-site/news-types'
import { formatNewsDate } from '@/lib/marketing-site/news-types'
import { routeToSlug } from '@/lib/marketing-site/paths'
import {
  extractImageFromHtml,
  normalizeNewsImagePath,
  pickSrcsetUrl,
} from '@/lib/marketing-news-images'

const PAGES_DIR = path.join(process.cwd(), 'content', 'marketing-pages')

const LIST_FILES = [
  'news.json',
  'category_news.json',
  'category_news_frontpage.json',
  'category_news_page_2.json',
  'category_news_page_3.json',
  'category_news_page_4.json',
  'category_news_page_5.json',
  'author_admin.json',
  'author_johnterry.json',
  'author_johnterry_page_2.json',
  'author_johnterry_page_3.json',
  'author_johnterry_page_4.json',
]

const LIVE_SITE = 'https://nwrma.gov.sl'

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&hellip;/g, '…')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function excerptFromText(text: string, max = 200): string {
  const t = stripHtml(text)
  if (!t || /^https?:\/\//i.test(t)) return ''
  if (t.length <= max) return t
  return `${t.slice(0, max).trim()}…`
}

type ListCard = {
  legacyPath: string
  title: string
  date: string
  publishedAt: string
  image?: string
  excerpt: string
  comments: number
}

function parseListCards(html: string): ListCard[] {
  const cards: ListCard[] = []
  const re = /<article[^>]*class="[^"]*w-grid-item[^"]*"[^>]*>([\s\S]*?)<\/article>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const block = m[1]
    const pathMatch = block.match(/usg_post_title_1[\s\S]*?href="(\/[^"#]+)"/)
    if (!pathMatch) continue
    const legacyPath = pathMatch[1].endsWith('/') ? pathMatch[1] : `${pathMatch[1]}/`
    const titleMatch = block.match(/usg_post_title_1[\s\S]*?<a[^>]*>([^<]+)<\/a>/)
    const dtMatch = block.match(/datetime="([^"]+)"/)
    const publishedAt = dtMatch?.[1] ? new Date(dtMatch[1]).toISOString() : new Date(0).toISOString()
    const dateMatch = block.match(/usg_post_date[\s\S]*?>([^<]+)</)
    const imgBlock = block.match(/usg_post_image[\s\S]*?<img[^>]+>/i)
    let image: string | undefined
    if (imgBlock) {
      const srcset = imgBlock[0].match(/srcset="([^"]+)"/i)?.[1]
      const src = imgBlock[0].match(/src="([^"]+)"/i)?.[1]
      image = normalizeNewsImagePath(pickSrcsetUrl(srcset) ?? src)
    }
    const contentMatch = block.match(/usg_post_content_1[^>]*>([\s\S]*?)<\/div>/i)
    const excerpt = contentMatch ? excerptFromText(contentMatch[1]) : ''
    const commentsMatch = block.match(/post_comments[\s\S]*?>\s*(\d+)\s*</)
    const comments = commentsMatch ? parseInt(commentsMatch[1], 10) : 0
    cards.push({
      legacyPath,
      title: stripHtml(titleMatch?.[1] ?? 'News'),
      date: stripHtml(dateMatch?.[1] ?? formatNewsDate(publishedAt)),
      publishedAt,
      image,
      excerpt,
      comments,
    })
  }
  return cards
}

function parseArticleHtml(html: string): {
  image?: string
  excerpt: string
  bodyHtml: string
  publishedAt?: string
  date?: string
  comments: number
} {
  const dtMatch = html.match(/post_date[^>]*datetime="([^"]+)"/)
  const publishedAt = dtMatch?.[1] ? new Date(dtMatch[1]).toISOString() : undefined
  const dateMatch = html.match(/post_date[^>]*>[\s\S]*?>([^<]+)</)
  const image = extractImageFromHtml(html)
  const contentMatch = html.match(/class="w-post-elm post_content"[^>]*>([\s\S]*?)<\/div>\s*<div class="w-separator/i)
  const bodyHtml = contentMatch?.[1]?.trim() ?? ''
  const excerpt = excerptFromText(bodyHtml)
  const commentsMatch = html.match(/post_comments[\s\S]*?>\s*([^<]+)\s*</)
  let comments = 0
  if (commentsMatch) {
    const raw = stripHtml(commentsMatch[1])
    const n = parseInt(raw, 10)
    comments = Number.isNaN(n) ? 0 : n
  }
  return {
    image,
    excerpt,
    bodyHtml,
    publishedAt,
    date: dateMatch ? stripHtml(dateMatch[1].replace(/Posted on\s*/i, '')) : undefined,
    comments,
  }
}

async function readPageJson(slug: string): Promise<{ title: string; html: string } | null> {
  try {
    const raw = await readFile(path.join(PAGES_DIR, `${slug}.json`), 'utf8')
    return JSON.parse(raw) as { title: string; html: string }
  } catch {
    return null
  }
}

function titleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[''`´]/g, '')
    .replace(/&amp;/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

let legacyCache: MarketingNewsPost[] | null = null

export async function loadLegacyNewsPosts(): Promise<MarketingNewsPost[]> {
  if (legacyCache) return legacyCache

  const byPath = new Map<string, ListCard>()
  for (const file of LIST_FILES) {
    const page = await readPageJson(file.replace('.json', ''))
    if (!page) continue
    for (const card of parseListCards(page.html)) {
      if (!byPath.has(card.legacyPath)) byPath.set(card.legacyPath, card)
    }
  }

  const posts: MarketingNewsPost[] = []
  for (const [legacyPath, card] of byPath) {
    const slug = routeToSlug(legacyPath.replace(/\/$/, ''))
    const article = await readPageJson(slug)
    const parsed = article ? parseArticleHtml(article.html) : null
    const image = parsed?.image ?? card.image ?? undefined
    posts.push({
      id: `legacy-${slug}`,
      slug,
      title: article?.title ?? card.title,
      date: parsed?.date ?? card.date,
      publishedAt: parsed?.publishedAt ?? card.publishedAt,
      image,
      excerpt: parsed?.excerpt || card.excerpt,
      bodyHtml: parsed?.bodyHtml ?? '',
      comments: parsed?.comments ?? card.comments,
      published: true,
      legacyPath,
      source: 'legacy',
    })
  }

  posts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
  legacyCache = posts
  return posts
}

export function clearLegacyNewsCache(): void {
  legacyCache = null
}

export function externalNewsUrl(legacyPath: string): string {
  const p = legacyPath.startsWith('/') ? legacyPath : `/${legacyPath}`
  return `${LIVE_SITE}${p.endsWith('/') ? p : `${p}/`}`
}

export function titleKeysMatch(a: string, b: string): boolean {
  return titleKey(a) === titleKey(b)
}

// Re-export for store
export { normalizeNewsImagePath as normalizeNewsImageUrl } from '@/lib/marketing-news-images'
