import 'server-only'

import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import type { MarketingNewsPost, MarketingNewsPostInput } from '@/lib/marketing-site/news-types'
import { formatNewsDate, newsPostPath, slugFromTitle } from '@/lib/marketing-site/news-types'
import { loadLegacyNewsPosts, titleKeysMatch } from '@/lib/marketing-news-legacy'
import {
  buildNewsImageCandidates,
  normalizeNewsImagePath,
} from '@/lib/marketing-news-images'

const DATA_DIR = path.join(process.cwd(), 'content', 'marketing-news')
const POSTS_FILE = path.join(DATA_DIR, 'posts.json')

type PostsFile = { posts: MarketingNewsPost[] }

async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true })
}

async function readAll(): Promise<MarketingNewsPost[]> {
  await ensureDataDir()
  try {
    const raw = await readFile(POSTS_FILE, 'utf8')
    const data = JSON.parse(raw) as PostsFile
    return Array.isArray(data.posts) ? data.posts : []
  } catch {
    return []
  }
}

async function writeAll(posts: MarketingNewsPost[]): Promise<void> {
  await ensureDataDir()
  const sorted = [...posts].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  )
  await writeFile(POSTS_FILE, JSON.stringify({ posts: sorted }, null, 2), 'utf8')
}

/** Maps short CMS seed slugs to original WordPress article paths. */
const CMS_SLUG_LEGACY_PATH: Record<string, string> = {
  'iwmi-concludes-scoping-mission': '/iwmi-concludes-scoping-mission-to-sierra-leone/',
  'govt-boosts-groundwater-knowledge':
    '/govt-of-sierra-leone-boosts-groundwater-knowledge-among-wash-experts/',
  'declining-water-levels-kono':
    '/declining-water-levels-in-kono-a-district-thirsting-for-solutions/',
  'parliament-approves-director-general': '/parliament-approves-the-new-director-general-for-nwrma/',
  'merry-christmas-and-happy-holidays': '/merry-christmas-and-happy-holidays/',
  'new-year-water-management-message':
    '/new-year-water-management-message-to-the-government-and-people-of-sierra-leone/',
}

function findLegacyMatch(
  post: MarketingNewsPost,
  legacy: MarketingNewsPost[],
): MarketingNewsPost | undefined {
  const mappedPath = post.legacyPath ?? CMS_SLUG_LEGACY_PATH[post.slug]
  if (mappedPath) {
    const byPath = legacy.find((leg) => leg.legacyPath === mappedPath)
    if (byPath) return byPath
  }
  return legacy.find((leg) => titleKeysMatch(post.title, leg.title))
}

/** Prefer scraped site images; only keep CMS image when uploaded via admin. */
function mergedImage(
  cms: MarketingNewsPost,
  match: MarketingNewsPost | undefined,
): string | undefined {
  const cmsImg = normalizeNewsImagePath(cms.image)
  if (cmsImg?.includes('/marketing-news/')) return cmsImg
  if (match?.image) return match.image
  return cmsImg
}

function mergeCmsWithLegacy(
  cms: MarketingNewsPost[],
  legacy: MarketingNewsPost[],
): MarketingNewsPost[] {
  const usedLegacy = new Set<string>()
  const merged: MarketingNewsPost[] = []

  for (const post of cms.filter((p) => p.published)) {
    const match = findLegacyMatch(post, legacy)
    if (match) usedLegacy.add(match.id)
    merged.push({
      ...post,
      source: post.source ?? 'cms',
      legacyPath: post.legacyPath ?? match?.legacyPath ?? CMS_SLUG_LEGACY_PATH[post.slug],
      image: mergedImage(post, match),
      date: match?.date ?? post.date,
      publishedAt: match?.publishedAt ?? post.publishedAt,
      excerpt: post.excerpt || match?.excerpt || '',
      bodyHtml: post.bodyHtml || match?.bodyHtml || '',
    })
  }

  for (const leg of legacy) {
    if (usedLegacy.has(leg.id)) continue
    merged.push(leg)
  }

  return merged.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  )
}

export async function listPublishedNewsPosts(): Promise<MarketingNewsPost[]> {
  const [cms, legacy] = await Promise.all([readAll(), loadLegacyNewsPosts()])
  return mergeCmsWithLegacy(cms, legacy)
}

export async function listAllNewsPosts(): Promise<MarketingNewsPost[]> {
  return readAll()
}

export async function getNewsPostBySlug(slug: string): Promise<MarketingNewsPost | null> {
  const posts = await readAll()
  return posts.find((p) => p.slug === slug && p.published) ?? null
}

export async function getNewsPostById(id: string): Promise<MarketingNewsPost | null> {
  const posts = await readAll()
  return posts.find((p) => p.id === id) ?? null
}

function uniqueSlug(base: string, posts: MarketingNewsPost[], excludeId?: string): string {
  let slug = base || 'news-item'
  let n = 0
  while (posts.some((p) => p.slug === slug && p.id !== excludeId)) {
    n += 1
    slug = `${base}-${n}`
  }
  return slug
}

export async function createNewsPost(input: MarketingNewsPostInput): Promise<MarketingNewsPost> {
  const posts = await readAll()
  const publishedAt = input.publishedAt ?? new Date().toISOString()
  const baseSlug = slugFromTitle(input.slug?.trim() || input.title)
  const slug = uniqueSlug(baseSlug, posts)
  const post: MarketingNewsPost = {
    id: randomUUID(),
    slug,
    title: input.title.trim(),
    date: input.date.trim() || formatNewsDate(publishedAt),
    publishedAt,
    image: input.image?.trim() || undefined,
    excerpt: input.excerpt.trim(),
    bodyHtml: input.bodyHtml.trim(),
    comments: input.comments ?? 0,
    published: input.published ?? true,
  }
  posts.push(post)
  await writeAll(posts)
  return post
}

export async function updateNewsPost(
  id: string,
  input: Partial<MarketingNewsPostInput>,
): Promise<MarketingNewsPost | null> {
  const posts = await readAll()
  const idx = posts.findIndex((p) => p.id === id)
  if (idx < 0) return null
  const current = posts[idx]
  const publishedAt = input.publishedAt ?? current.publishedAt
  const title = input.title !== undefined ? input.title.trim() : current.title
  const baseSlug =
    input.slug !== undefined ? slugFromTitle(input.slug.trim() || title) : current.slug
  const slug = uniqueSlug(baseSlug, posts, id)
  const updated: MarketingNewsPost = {
    ...current,
    slug,
    title,
    date:
      input.date !== undefined
        ? input.date.trim() || formatNewsDate(publishedAt)
        : current.date,
    publishedAt,
    image: input.image !== undefined ? input.image.trim() || undefined : current.image,
    excerpt: input.excerpt !== undefined ? input.excerpt.trim() : current.excerpt,
    bodyHtml: input.bodyHtml !== undefined ? input.bodyHtml.trim() : current.bodyHtml,
    comments: input.comments ?? current.comments,
    published: input.published ?? current.published,
  }
  posts[idx] = updated
  await writeAll(posts)
  return updated
}

export async function deleteNewsPost(id: string): Promise<boolean> {
  const posts = await readAll()
  const next = posts.filter((p) => p.id !== id)
  if (next.length === posts.length) return false
  await writeAll(next)
  return true
}

export function postToCardItem(post: MarketingNewsPost) {
  const legacyPath = post.legacyPath?.endsWith('/') ? post.legacyPath : post.legacyPath ? `${post.legacyPath}/` : undefined
  const image = normalizeNewsImagePath(post.image)
  return {
    title: post.title,
    path: legacyPath ?? (post.source === 'legacy' ? `/${post.slug}/` : newsPostPath(post.slug)),
    date: post.date,
    image,
    imageSources: buildNewsImageCandidates(image),
    excerpt: post.excerpt,
    comments: post.comments,
  }
}
