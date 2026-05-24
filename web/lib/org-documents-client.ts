import { resolvedApiUrl } from '@/lib/apiBase'
import type { OrgDepartmentDocument } from '@/lib/org-documents-store'
import type { Department } from '@/lib/types'

type FetchHeaders = HeadersInit | Record<string, string>

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(
      typeof (data as { error?: string }).error === 'string'
        ? (data as { error: string }).error
        : 'Request failed'
    )
  }
  return data as T
}

export async function fetchOrgDocuments(
  headers: FetchHeaders,
  opts?: {
    q?: string
    scope?: 'all' | 'inbox' | 'sent'
    homeDepartment?: Exclude<Department, null>
  }
): Promise<OrgDepartmentDocument[]> {
  const params = new URLSearchParams()
  if (opts?.q) params.set('q', opts.q)
  if (opts?.scope) params.set('scope', opts.scope)
  if (opts?.homeDepartment) params.set('homeDepartment', opts.homeDepartment)
  const q = params.toString() ? `?${params}` : ''
  const data = await parseJson<{ documents: OrgDepartmentDocument[] }>(
    await fetch(resolvedApiUrl(`/api/org-documents${q}`), {
      headers,
      credentials: 'same-origin',
    })
  )
  return data.documents
}

export async function uploadOrgDocument(
  headers: FetchHeaders,
  form: FormData
): Promise<OrgDepartmentDocument> {
  const data = await parseJson<{ document: OrgDepartmentDocument }>(
    await fetch(resolvedApiUrl('/api/org-documents'), {
      method: 'POST',
      headers,
      credentials: 'same-origin',
      body: form,
    })
  )
  return data.document
}

export function orgDocumentDownloadUrl(id: string): string {
  return resolvedApiUrl(`/api/org-documents/${encodeURIComponent(id)}/download`)
}

export function formatFileSize(bytes: number | null): string {
  if (bytes == null || bytes === 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
