import { resolvedApiUrl } from '@/lib/apiBase'

export type FetchJsonResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; networkError: true; message: string }
  | { ok: false; networkError?: false; status: number; data: T }

export async function fetchJson<T>(
  path: string,
  init?: RequestInit
): Promise<FetchJsonResult<T>> {
  try {
    const res = await fetch(resolvedApiUrl(path), {
      credentials: 'same-origin',
      ...init,
      headers: {
        ...init?.headers,
      },
    })
    let data: T
    try {
      data = (await res.json()) as T
    } catch {
      return {
        ok: false,
        networkError: true,
        message: `Invalid response from server (HTTP ${res.status}).`,
      }
    }
    if (!res.ok) {
      return { ok: false, status: res.status, data }
    }
    return { ok: true, status: res.status, data }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : 'Request failed — check network and API base URL.'
    return { ok: false, networkError: true, message }
  }
}

export function apiErrorMessage(
  data: { error?: string; hint?: string } | undefined,
  fallback: string
): string {
  const detail = [data?.error, data?.hint].filter(Boolean).join(' ')
  return detail || fallback
}
