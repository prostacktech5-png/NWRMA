import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

export const MAX_ORG_DOCUMENT_BYTES = 10 * 1024 * 1024

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.ms-excel',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'text/plain',
])

const EXT_MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.doc': 'application/msword',
  '.xls': 'application/vnd.ms-excel',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.txt': 'text/plain',
}

export function getOrgDocumentsFilesRoot(): string {
  return path.join(process.cwd(), 'data', 'org-documents')
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120) || 'file'
}

export function guessMimeFromFilename(name: string): string {
  const ext = path.extname(name).toLowerCase()
  return EXT_MIME[ext] ?? 'application/octet-stream'
}

export function isAllowedOrgDocumentMime(mime: string, fileName: string): boolean {
  const m = mime.toLowerCase().split(';')[0]?.trim() ?? ''
  if (ALLOWED_MIME.has(m)) return true
  const guessed = guessMimeFromFilename(fileName)
  return ALLOWED_MIME.has(guessed)
}

export async function saveOrgDocumentFile(params: {
  originalName: string
  mimeType: string
  buffer: Buffer
}): Promise<{ storageKey: string; mimeType: string; sizeBytes: number }> {
  if (params.buffer.length > MAX_ORG_DOCUMENT_BYTES) {
    throw new Error(`File "${params.originalName}" exceeds 10 MB limit.`)
  }
  const mime =
    params.mimeType.split(';')[0]?.trim() || guessMimeFromFilename(params.originalName)
  if (!isAllowedOrgDocumentMime(mime, params.originalName)) {
    throw new Error(
      `File type not allowed for "${params.originalName}". Use PDF, Word, Excel, images, or plain text.`
    )
  }

  const fileId = randomUUID()
  const safeName = sanitizeFilename(params.originalName)
  const storageKey = `${fileId}/${safeName}`.replace(/\\/g, '/')
  const absolute = path.join(getOrgDocumentsFilesRoot(), storageKey)
  await mkdir(path.dirname(absolute), { recursive: true })
  await writeFile(absolute, params.buffer)

  return {
    storageKey,
    mimeType: mime,
    sizeBytes: params.buffer.length,
  }
}

export async function readOrgDocumentFile(
  storageKey: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  const normalized = storageKey.replace(/\\/g, '/')
  if (normalized.includes('..')) {
    throw new Error('Invalid storage key')
  }
  const absolute = path.join(getOrgDocumentsFilesRoot(), normalized)
  const buffer = await readFile(absolute)
  const mimeType = guessMimeFromFilename(path.basename(normalized))
  return { buffer, mimeType }
}
