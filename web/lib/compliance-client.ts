import { resolvedApiUrl } from '@/lib/apiBase'
import type { LroCampaign, LroComplianceCase, LroLegalMatter, LroRegulationRef } from '@/lib/lro-store'

export type LicenseLookupResult = {
  id: string
  reference: string
  organisationName: string
  applicantName: string
  status: string
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(typeof (data as { error?: string }).error === 'string' ? (data as { error: string }).error : 'Request failed')
  }
  return data as T
}

type FetchHeaders = HeadersInit | Record<string, string>

export async function fetchComplianceCases(
  headers: FetchHeaders,
  search?: string
): Promise<LroComplianceCase[]> {
  const q = search ? `?search=${encodeURIComponent(search)}` : ''
  const data = await parseJson<{ cases: LroComplianceCase[] }>(
    await fetch(resolvedApiUrl(`/api/compliance/cases${q}`), {
      headers,
      credentials: 'same-origin',
    })
  )
  return data.cases
}

export async function fetchLegalMatters(
  headers: FetchHeaders,
  opts?: { matterType?: string; search?: string }
): Promise<LroLegalMatter[]> {
  const params = new URLSearchParams()
  if (opts?.matterType) params.set('matterType', opts.matterType)
  if (opts?.search) params.set('search', opts.search)
  const q = params.toString() ? `?${params}` : ''
  const data = await parseJson<{ matters: LroLegalMatter[] }>(
    await fetch(resolvedApiUrl(`/api/compliance/legal-matters${q}`), {
      headers,
      credentials: 'same-origin',
    })
  )
  return data.matters
}

export async function fetchCampaigns(
  headers: FetchHeaders,
  opts?: { theme?: string; search?: string }
): Promise<LroCampaign[]> {
  const params = new URLSearchParams()
  if (opts?.theme && opts.theme !== 'all') params.set('theme', opts.theme)
  if (opts?.search) params.set('search', opts.search)
  const q = params.toString() ? `?${params}` : ''
  const data = await parseJson<{ campaigns: LroCampaign[] }>(
    await fetch(resolvedApiUrl(`/api/compliance/campaigns${q}`), {
      headers,
      credentials: 'same-origin',
    })
  )
  return data.campaigns
}

export async function fetchRegulations(
  headers: FetchHeaders,
  category?: string
): Promise<LroRegulationRef[]> {
  const q = category && category !== 'all' ? `?category=${encodeURIComponent(category)}` : ''
  const data = await parseJson<{ regulations: LroRegulationRef[] }>(
    await fetch(resolvedApiUrl(`/api/compliance/regulations${q}`), {
      headers,
      credentials: 'same-origin',
    })
  )
  return data.regulations
}

export async function lookupLicenses(
  headers: FetchHeaders,
  q: string
): Promise<LicenseLookupResult[]> {
  if (q.trim().length < 2) return []
  const data = await parseJson<{ results: LicenseLookupResult[] }>(
    await fetch(resolvedApiUrl(`/api/compliance/license-lookup?q=${encodeURIComponent(q)}`), {
      headers,
      credentials: 'same-origin',
    })
  )
  return data.results
}

export async function postJson<T>(
  url: string,
  headers: FetchHeaders,
  body: unknown
): Promise<T> {
  return parseJson<T>(
    await fetch(resolvedApiUrl(url), {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    })
  )
}

export async function patchJson<T>(
  url: string,
  headers: FetchHeaders,
  body: unknown
): Promise<T> {
  return parseJson<T>(
    await fetch(resolvedApiUrl(url), {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    })
  )
}
