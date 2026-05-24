import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
import { hydroStore } from './db'

const JWT_KEY = 'nwrma_api_access_token'
const SESSION_KEY = 'hydrogauge_user_id'
const WORKING_BASE_KEY = 'nwrma_api_working_base'

export type EnsureJwtResult = { token: string | null; error?: string }

function normalizeBase(url: string): string {
  return url.trim().replace(/\/$/, '')
}

/** API URLs baked into the APK via env/nwrma.env → npm run sync:env → mobile:release */
export function configuredApiBases(): string[] {
  const primary = process.env.EXPO_PUBLIC_NWRMA_SERVER_URL?.trim()
  const fallback = process.env.EXPO_PUBLIC_NWRMA_SERVER_URL_FALLBACK?.trim()
  const out: string[] = []
  // Primary first (public internet when NWRMA_API_URL is set); LAN as optional fallback.
  if (primary) out.push(normalizeBase(primary))
  if (fallback && fallback !== primary) out.push(normalizeBase(fallback))
  if (__DEV__ && out.length === 0) {
    out.push(Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://127.0.0.1:4000')
  }
  return [...new Set(out)]
}

export function resolveNwrmaServerBase(): string {
  return configuredApiBases()[0] ?? ''
}

async function healthOk(base: string): Promise<boolean> {
  try {
    const res = await fetch(`${base}/health`, {
      headers: nwrmaApiHeaders(),
      method: 'GET',
    })
    const text = await res.text()
    return res.ok && !isHtmlResponse(text)
  } catch {
    return false
  }
}

async function cacheWorkingBase(base: string): Promise<void> {
  await AsyncStorage.setItem(WORKING_BASE_KEY, normalizeBase(base))
}

/** Pick a reachable API URL from env (tunnel + optional office Wi‑Fi LAN). */
export async function resolveNwrmaServerBaseAsync(options?: {
  rediscover?: boolean
}): Promise<string> {
  const bases = configuredApiBases()
  if (bases.length === 0) return ''

  if (!options?.rediscover) {
    const cached = await AsyncStorage.getItem(WORKING_BASE_KEY)
    if (cached?.trim() && (await healthOk(normalizeBase(cached)))) {
      return normalizeBase(cached)
    }
  } else {
    await AsyncStorage.removeItem(WORKING_BASE_KEY)
  }

  const reachable: string[] = []
  for (const base of bases) {
    if (await healthOk(base)) reachable.push(base)
  }
  if (reachable.length > 0) {
    const pick = reachable[0]
    await cacheWorkingBase(pick)
    return pick
  }

  return bases[0]
}

/** True when GET /health succeeds for the resolved API base. */
export async function probeNwrmaServerReachability(options?: {
  rediscover?: boolean
}): Promise<{ reachable: boolean; base: string }> {
  const base = (await resolveNwrmaServerBaseAsync(options)).trim()
  if (!base) return { reachable: false, base: '' }
  const reachable = await healthOk(base)
  return { reachable, base }
}

export function nwrmaApiHeaders(extra?: HeadersInit): HeadersInit {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'HydroGaugeSL/1.0',
    'Bypass-Tunnel-Reminder': 'true',
    ...extra,
  }
}

export async function setNwrmaApiJwt(token: string | null): Promise<void> {
  if (!token) await AsyncStorage.removeItem(JWT_KEY)
  else await AsyncStorage.setItem(JWT_KEY, token)
}

export async function getNwrmaApiJwt(): Promise<string | null> {
  return AsyncStorage.getItem(JWT_KEY)
}

function isHtmlResponse(rawText: string): boolean {
  const t = rawText.trim().toLowerCase()
  return t.startsWith('<!doctype') || t.startsWith('<html')
}

export function phoneLoginVariants(phone: string): string[] {
  const trimmed = phone.trim()
  const digits = trimmed.replace(/\D/g, '')
  const out = new Set<string>()
  if (trimmed) out.add(trimmed)
  if (digits) out.add(digits)
  if (digits && !trimmed.startsWith('+')) {
    out.add(`+${digits}`)
    if (digits.startsWith('232')) out.add(`+${digits}`)
    else if (digits.length >= 8) out.add(`+232${digits.replace(/^0+/, '')}`)
  }
  return [...out]
}

function parseAuthToken(rawText: string, res: Response): { token: string | null; error?: string } {
  if (isHtmlResponse(rawText)) {
    return {
      token: null,
      error: 'Cannot reach the NWRMA server. Check your internet connection and try again.',
    }
  }
  let data = {} as Record<string, unknown>
  try {
    data = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {}
  } catch {
    return {
      token: null,
      error: 'Server returned an unexpected response. Try again in a moment.',
    }
  }
  const token = typeof data.token === 'string' ? data.token : ''
  if (res.ok && token) return { token }
  const msg =
    typeof data.error === 'string'
      ? data.error
      : typeof data.message === 'string'
        ? data.message
        : `Server error (${res.status})`
  return { token: null, error: msg }
}

async function postAuth(
  base: string,
  path: 'login' | 'register' | 'field-ensure',
  body: Record<string, unknown>,
): Promise<{ token: string | null; error?: string; status: number }> {
  const res = await fetch(`${base}/auth/${path}`, {
    method: 'POST',
    headers: nwrmaApiHeaders(),
    body: JSON.stringify(body),
  })
  const rawText = await res.text()
  const parsed = parseAuthToken(rawText, res)
  return { ...parsed, status: res.status }
}

async function authenticateOnBase(
  base: string,
  user: { phone: string; name: string; password: string },
): Promise<{ token: string | null; error?: string }> {
  const phones = phoneLoginVariants(user.phone)
  let lastError = 'Invalid phone or password.'

  for (const phone of phones) {
    const ensured = await postAuth(base, 'field-ensure', {
      phone,
      name: user.name.trim(),
      password: user.password,
    })
    if (ensured.token) return { token: ensured.token }
    if (ensured.error && ensured.status !== 404) lastError = ensured.error

    let { token, error, status } = await postAuth(base, 'login', {
      phone,
      password: user.password,
    })
    if (token) return { token }

    if (error) lastError = error

    if ((status === 401 || status === 404) && user.name && phone.replace(/\D/g, '').length >= 6) {
      const reg = await postAuth(base, 'register', {
        phone,
        name: user.name.trim(),
        password: user.password,
        role: 'staff',
      })
      if (reg.token) return { token: reg.token }

      if (reg.status === 409) {
        const retry = await postAuth(base, 'login', { phone, password: user.password })
        if (retry.token) return { token: retry.token }
        if (retry.error) lastError = retry.error
      } else if (reg.error) {
        lastError = reg.error
      }
    }
  }

  if (user.phone.replace(/\D/g, '').length < 6) {
    return {
      token: null,
      error:
        'Use a phone number with at least 6 digits (e.g. 23276123456) when you register or sign in.',
    }
  }

  return { token: null, error: lastError }
}

/** Sign in on the NWRMA API using saved field-officer credentials. */
export async function ensureNwrmaApiJwt(options?: {
  forceRefresh?: boolean
}): Promise<EnsureJwtResult> {
  if (!options?.forceRefresh) {
    const cached = await getNwrmaApiJwt()
    if (cached) return { token: cached }
  } else {
    await setNwrmaApiJwt(null)
  }

  if (configuredApiBases().length === 0) {
    return {
      token: null,
      error: 'This app is not configured with a server address. Contact NWRMA support.',
    }
  }

  const userId = await AsyncStorage.getItem(SESSION_KEY)
  if (!userId) {
    return { token: null, error: 'Please sign in first.' }
  }

  const user = await hydroStore.getUserById(userId)
  const password = user?.password
  if (!user?.phone?.trim() || !password || !user.name) {
    return { token: null, error: 'Please sign out and sign in again.' }
  }

  const creds = { phone: user.phone, name: user.name, password }
  const bases = configuredApiBases()
  let lastReachError =
    'Cannot reach the NWRMA server. Check internet or Wi‑Fi and try Sync again.'

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await AsyncStorage.removeItem(WORKING_BASE_KEY)

    const reachable: string[] = []
    for (const base of bases) {
      if (await healthOk(base)) reachable.push(base)
    }
    const tryBases = reachable.length > 0 ? reachable : [...bases]

    for (const base of tryBases) {
      const auth = await authenticateOnBase(base, creds)
      if (auth.token) {
        await setNwrmaApiJwt(auth.token)
        await cacheWorkingBase(base)
        return { token: auth.token }
      }
      if (auth.error) lastReachError = auth.error
    }
  }

  return {
    token: null,
    error: lastReachError.includes('Sign out')
      ? lastReachError
      : `${lastReachError} Try Sync again, or sign out and sign in with your phone and password.`,
  }
}
