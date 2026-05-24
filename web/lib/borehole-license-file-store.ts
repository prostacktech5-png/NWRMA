import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import type { DocumentSlotId } from '@/lib/borehole-licensing-documents'
import type { LicenseApplicationDocumentMeta } from '@/lib/types'

export const MAX_LICENSE_FILE_BYTES = 10 * 1024 * 1024

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
])

export function getLicenseFilesRoot(): string {
  return path.join(process.cwd(), 'data', 'borehole-license-files')
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120) || 'file'
}

export function isAllowedLicenseMime(mime: string): boolean {
  const m = mime.toLowerCase().split(';')[0]?.trim() ?? ''
  return ALLOWED_MIME.has(m)
}

export function newLicenseFileId(): string {
  return `f-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export async function saveLicenseFileFromBuffer(params: {
  applicationId: string
  slotId: DocumentSlotId
  fileId: string
  originalName: string
  mimeType: string
  buffer: Buffer
}): Promise<LicenseApplicationDocumentMeta> {
  if (params.buffer.length > MAX_LICENSE_FILE_BYTES) {
    throw new Error(`File "${params.originalName}" exceeds 10 MB limit.`)
  }
  if (!isAllowedLicenseMime(params.mimeType)) {
    throw new Error(`File type not allowed for "${params.originalName}". Use PDF, JPG, or PNG.`)
  }

  const safeName = sanitizeFilename(params.originalName)
  const storageKey = path.join(
    params.applicationId,
    params.slotId,
    `${params.fileId}-${safeName}`
  )
  const absolute = path.join(getLicenseFilesRoot(), storageKey)
  await mkdir(path.dirname(absolute), { recursive: true })
  await writeFile(absolute, params.buffer)

  return {
    id: params.fileId,
    name: params.originalName,
    size: params.buffer.length,
    mimeType: params.mimeType.split(';')[0]?.trim() || 'application/octet-stream',
    storageKey: storageKey.replace(/\\/g, '/'),
  }
}

export async function readLicenseFile(
  storageKey: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  const normalized = storageKey.replace(/\\/g, '/')
  if (normalized.includes('..')) {
    throw new Error('Invalid storage key.')
  }
  const absolute = path.join(getLicenseFilesRoot(), normalized)
  const buffer = await readFile(absolute)
  const ext = path.extname(normalized).toLowerCase()
  const mimeType =
    ext === '.pdf'
      ? 'application/pdf'
      : ext === '.png'
        ? 'image/png'
        : ext === '.jpg' || ext === '.jpeg'
          ? 'image/jpeg'
          : 'application/octet-stream'
  return { buffer, mimeType }
}

export function findApplicationDocument(
  application: { documents: Record<DocumentSlotId, LicenseApplicationDocumentMeta[]> },
  fileId: string
): LicenseApplicationDocumentMeta | undefined {
  for (const slot of Object.keys(application.documents) as DocumentSlotId[]) {
    const hit = application.documents[slot]?.find((f) => f.id === fileId)
    if (hit) return hit
  }
  return undefined
}
