import { createHash } from 'crypto'
import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import {
  isAllowedLicenseMime,
  MAX_LICENSE_FILE_BYTES,
  newLicenseFileId,
} from '@/lib/borehole-license-file-store'
import type { OnlineFormPaymentIntakeReceiptFile } from '@/lib/types'

export { MAX_LICENSE_FILE_BYTES, isAllowedLicenseMime, newLicenseFileId }

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120) || 'file'
}

export function getPaymentIntakeFilesRoot(): string {
  return path.join(process.cwd(), 'data', 'online-form-payment-intakes')
}

export async function savePaymentIntakeReceiptFromBuffer(params: {
  intakeId: string
  originalName: string
  mimeType: string
  buffer: Buffer
}): Promise<OnlineFormPaymentIntakeReceiptFile> {
  if (params.buffer.length > MAX_LICENSE_FILE_BYTES) {
    throw new Error(`File "${params.originalName}" exceeds 10 MB limit.`)
  }
  if (!isAllowedLicenseMime(params.mimeType)) {
    throw new Error(`File type not allowed for "${params.originalName}". Use PDF, JPG, or PNG.`)
  }

  const fileId = newLicenseFileId()
  const safeName = sanitizeFilename(params.originalName)
  const storageKey = path.join(params.intakeId, 'bankReceipt', `${fileId}-${safeName}`)
  const absolute = path.join(getPaymentIntakeFilesRoot(), storageKey)
  await mkdir(path.dirname(absolute), { recursive: true })
  await writeFile(absolute, params.buffer)

  return {
    id: fileId,
    name: params.originalName,
    size: params.buffer.length,
    mimeType: params.mimeType.split(';')[0]?.trim() || 'application/octet-stream',
    storageKey: storageKey.replace(/\\/g, '/'),
  }
}

export async function readPaymentIntakeReceipt(
  storageKey: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  const normalized = storageKey.replace(/\\/g, '/')
  if (normalized.includes('..')) throw new Error('Invalid storage key.')
  const absolute = path.join(getPaymentIntakeFilesRoot(), normalized)
  const buffer = await readFile(absolute)
  const ext = path.extname(normalized).toLowerCase()
  const mimeType =
    ext === '.pdf'
      ? 'application/pdf'
      : ext === '.png'
        ? 'image/png'
        : 'image/jpeg'
  return { buffer, mimeType }
}

export function hashResumeToken(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex')
}
