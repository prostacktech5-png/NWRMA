import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import type { DamSafetyDocumentSlotId } from '@/lib/dam-safety-documents'
import type { DamSafetyDocumentMeta } from '@/lib/types'
import {
  isAllowedLicenseMime,
  MAX_LICENSE_FILE_BYTES,
  newLicenseFileId,
} from '@/lib/borehole-license-file-store'

export { MAX_LICENSE_FILE_BYTES, isAllowedLicenseMime, newLicenseFileId }

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120) || 'file'
}

export function getDamSafetyFilesRoot(): string {
  return path.join(process.cwd(), 'data', 'dam-safety-files')
}

export async function saveDamSafetyFileFromBuffer(params: {
  applicationId: string
  slotId: DamSafetyDocumentSlotId
  fileId: string
  originalName: string
  mimeType: string
  buffer: Buffer
}): Promise<DamSafetyDocumentMeta> {
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
  const absolute = path.join(getDamSafetyFilesRoot(), storageKey)
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

export async function readDamSafetyFile(
  storageKey: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  const normalized = storageKey.replace(/\\/g, '/')
  if (normalized.includes('..')) throw new Error('Invalid storage key.')
  const absolute = path.join(getDamSafetyFilesRoot(), normalized)
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

export function findDamSafetyDocument(
  application: { documents: Record<DamSafetyDocumentSlotId, DamSafetyDocumentMeta[]> },
  fileId: string
): DamSafetyDocumentMeta | undefined {
  for (const slot of Object.keys(application.documents) as DamSafetyDocumentSlotId[]) {
    const hit = application.documents[slot]?.find((f) => f.id === fileId)
    if (hit) return hit
  }
  return undefined
}
