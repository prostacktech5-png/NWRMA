import { resolvedApiUrl } from '@/lib/apiBase'

/** Keep under next.config middlewareClientMaxBodySize (100 MB). */
export const PUBLIC_APPLICATION_MAX_UPLOAD_BYTES = 95 * 1024 * 1024

export function totalUploadBytes(filesBySlot: Record<string, File[] | undefined>): number {
  let total = 0
  for (const files of Object.values(filesBySlot)) {
    for (const file of files ?? []) {
      total += file.size
    }
  }
  return total
}

export function publicUploadTooLargeMessage(totalBytes: number): string | null {
  if (totalBytes <= PUBLIC_APPLICATION_MAX_UPLOAD_BYTES) return null
  const mb = (totalBytes / (1024 * 1024)).toFixed(1)
  return `Total upload size is about ${mb} MB, which exceeds the limit. Use files of 10 MB or less each and submit fewer files at once if needed.`
}

export async function postPublicApplication(
  apiPath: string,
  body: FormData
): Promise<Response> {
  return fetch(resolvedApiUrl(apiPath), {
    method: 'POST',
    body,
  })
}
