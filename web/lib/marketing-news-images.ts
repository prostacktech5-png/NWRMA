/** Resolve news thumbnails against the live NWRMA WordPress media library. */

const LIVE_WP = 'https://nwrma.gov.sl/wp-content/uploads'
const LIVE_ASSETS = 'https://nwrma.gov.sl/assets/uploads'

/** Relative path under uploads/, e.g. 2025/06/photo.jpg */
export function uploadsRelativePath(url: string): string {
  let rel = url.trim()
  rel = rel.replace(/https?:\/\/(?:www\.)?nwrma\.gov\.sl\/+\/?(?:assets|wp-content)\/uploads\//i, '')
  rel = rel.replace(/^\/assets\/uploads\//, '')
  rel = rel.replace(/^\/+/, '')
  return rel
}

/** Ordered candidates: live wp-content first, then local mirror, then live /assets path. */
export function buildNewsImageCandidates(imagePath?: string): string[] {
  if (!imagePath?.trim()) return []
  if (/\.(mp4|webm|mov)(\?|$)/i.test(imagePath)) return []

  const rel = uploadsRelativePath(imagePath)
  if (!rel) return []

  const variants = [rel]
  const withoutSize = rel.replace(/-\d+x\d+(\.[a-z0-9]+)$/i, '$1')
  if (withoutSize !== rel) variants.push(withoutSize)

  const out: string[] = []
  for (const v of variants) {
    out.push(`${LIVE_WP}/${v}`)
    out.push(`/assets/uploads/${v}`)
    out.push(`${LIVE_ASSETS}/${v}`)
  }
  return [...new Set(out)]
}

export function pickSrcsetUrl(srcset: string | undefined): string | undefined {
  if (!srcset) return undefined
  let pick1024: string | undefined
  let largest: { url: string; w: number } | null = null
  for (const part of srcset.split(',')) {
    const bits = part.trim().split(/\s+/)
    const url = bits[0]
    const w = bits[1]?.endsWith('w') ? parseInt(bits[1], 10) : 0
    if (!url) continue
    if (w >= 1024 && w < 2000) pick1024 = url
    if (!largest || w > largest.w) largest = { url, w }
  }
  return pick1024 ?? largest?.url
}

export function normalizeNewsImagePath(url: string | undefined): string | undefined {
  if (!url?.trim()) return undefined
  let u = url.trim()
  u = u.replace(/https?:\/\/(?:www\.)?nwrma\.gov\.sl\/+\/?(?:assets|wp-content)\/uploads\//i, '/assets/uploads/')
  u = u.replace(/^\/\/nwrma\.gov\.sl\/+\/assets\/uploads\//i, '/assets/uploads/')
  if (/\.(mp4|webm|mov)(\?|$)/i.test(u)) return undefined
  if (u.startsWith('http')) {
    const rel = uploadsRelativePath(u)
    return rel ? `/assets/uploads/${rel}` : undefined
  }
  if (!u.startsWith('/')) u = `/${u}`
  if (!u.startsWith('/assets/uploads/')) u = `/assets/uploads/${uploadsRelativePath(u)}`
  return u
}

export function extractImageFromHtml(html: string): string | undefined {
  const sharing = html.match(/data-sharing-image="([^"]+)"/i)?.[1]
  const fromSharing = normalizeNewsImagePath(sharing)
  if (fromSharing) return fromSharing

  const imgBlock = html.match(/class="w-post-elm post_image"[\s\S]*?<img[^>]+>/i)
  if (imgBlock) {
    const srcset = imgBlock[0].match(/srcset="([^"]+)"/i)?.[1]
    const src = imgBlock[0].match(/src="([^"]+)"/i)?.[1]
    const picked = pickSrcsetUrl(srcset) ?? src
    const norm = normalizeNewsImagePath(picked)
    if (norm) return norm
  }

  const contentImg = html.match(
    /class="w-post-elm post_content"[\s\S]*?<img[^>]+src="([^"]+)"/i,
  )?.[1]
  return normalizeNewsImagePath(contentImg)
}
