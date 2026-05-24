import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

export const MAX_MARKETING_NEWS_IMAGE_BYTES = 5 * 1024 * 1024

const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'])

export function getMarketingNewsUploadsDir(): string {
  return path.join(process.cwd(), 'public', 'assets', 'uploads', 'marketing-news')
}

function extForMime(mime: string): string {
  const m = mime.toLowerCase().split(';')[0]?.trim() ?? ''
  if (m === 'image/png') return '.png'
  if (m === 'image/webp') return '.webp'
  if (m === 'image/gif') return '.gif'
  return '.jpg'
}

export function isAllowedNewsImageMime(mime: string): boolean {
  const m = mime.toLowerCase().split(';')[0]?.trim() ?? ''
  return ALLOWED_MIME.has(m)
}

export async function saveMarketingNewsImage(
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  if (buffer.length > MAX_MARKETING_NEWS_IMAGE_BYTES) {
    throw new Error('Image must be 5 MB or smaller.')
  }
  if (!isAllowedNewsImageMime(mimeType)) {
    throw new Error('Use a JPG, PNG, WebP, or GIF image.')
  }
  const dir = getMarketingNewsUploadsDir()
  await mkdir(dir, { recursive: true })
  const name = `${Date.now()}-${randomUUID().slice(0, 8)}${extForMime(mimeType)}`
  await writeFile(path.join(dir, name), buffer)
  return `/assets/uploads/marketing-news/${name}`
}
