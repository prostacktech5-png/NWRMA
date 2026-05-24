import { mkdir, readdir, readFile, unlink, writeFile } from 'fs/promises'
import path from 'path'

export const MAX_HR_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024

const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])

export function getHrProfileImagesRoot(): string {
  return path.join(process.cwd(), 'data', 'hr-profile-images')
}

export function hrProfileImageApiPath(employeeId: string): string {
  return `/api/hr/employees/${encodeURIComponent(employeeId)}/profile-image`
}

export function isAllowedProfileImageMime(mime: string): boolean {
  const m = mime.toLowerCase().split(';')[0]?.trim() ?? ''
  return ALLOWED_MIME.has(m)
}

function safeEmployeeDir(employeeId: string): string {
  return employeeId.replace(/[^a-zA-Z0-9_-]+/g, '_')
}

function extForMime(mime: string): string {
  const m = mime.toLowerCase().split(';')[0]?.trim() ?? ''
  if (m === 'image/png') return '.png'
  if (m === 'image/webp') return '.webp'
  return '.jpg'
}

export async function saveHrProfileImage(
  employeeId: string,
  buffer: Buffer,
  mimeType: string
): Promise<void> {
  if (buffer.length > MAX_HR_PROFILE_IMAGE_BYTES) {
    throw new Error('Profile image must be 2 MB or smaller.')
  }
  if (!isAllowedProfileImageMime(mimeType)) {
    throw new Error('Use a JPG, PNG, or WebP image.')
  }
  const dirName = safeEmployeeDir(employeeId)
  const dir = path.join(getHrProfileImagesRoot(), dirName)
  await mkdir(dir, { recursive: true })
  const entries = await readdir(dir).catch(() => [] as string[])
  for (const name of entries) {
    if (name.startsWith('profile.')) {
      await unlink(path.join(dir, name)).catch(() => {})
    }
  }
  const ext = extForMime(mimeType)
  await writeFile(path.join(dir, `profile${ext}`), buffer)
}

export async function readHrProfileImage(
  employeeId: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const dir = path.join(getHrProfileImagesRoot(), safeEmployeeDir(employeeId))
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return null
  }
  const hit = entries.find((n) => n.startsWith('profile.'))
  if (!hit) return null
  const buffer = await readFile(path.join(dir, hit))
  const ext = path.extname(hit).toLowerCase()
  const mimeType =
    ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
  return { buffer, mimeType }
}

export async function deleteHrProfileImage(employeeId: string): Promise<void> {
  const dir = path.join(getHrProfileImagesRoot(), safeEmployeeDir(employeeId))
  try {
    const entries = await readdir(dir)
    for (const name of entries) {
      if (name.startsWith('profile.')) {
        await unlink(path.join(dir, name)).catch(() => {})
      }
    }
  } catch {
    /* ignore */
  }
}
