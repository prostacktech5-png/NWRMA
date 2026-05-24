/**
 * Single source of truth: env/nwrma.env → server, web, and mobile env files.
 * Run before `npm run dev` or `npm run mobile:release`.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const masterPath = path.join(root, 'env', 'nwrma.env')
const examplePath = path.join(root, 'env', 'nwrma.env.example')

function parseEnvFile(content) {
  const map = new Map()
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    map.set(key, val)
  }
  return map
}

function serializeEnv(map, header = '') {
  const lines = header ? [header, ''] : []
  for (const [k, v] of map) {
    const needsQuote = /[\s#]/.test(v)
    lines.push(needsQuote ? `${k}="${v.replace(/"/g, '\\"')}"` : `${k}=${v}`)
  }
  return `${lines.join('\n')}\n`
}

function readIfExists(p) {
  try {
    return fs.readFileSync(p, 'utf8')
  } catch {
    return null
  }
}

function bootstrapMaster() {
  if (fs.existsSync(masterPath)) return

  fs.mkdirSync(path.dirname(masterPath), { recursive: true })
  const serverEnv = readIfExists(path.join(root, 'server', '.env')) ?? ''
  const webEnv = readIfExists(path.join(root, 'web', '.env.local')) ?? ''
  const merged = new Map([...parseEnvFile(serverEnv), ...parseEnvFile(webEnv)])

  if (!merged.has('NWRMA_API_URL')) {
    merged.set('NWRMA_API_URL', '')
  }
  if (!merged.has('HOST')) merged.set('HOST', '0.0.0.0')
  if (!merged.has('PORT')) merged.set('PORT', '4000')

  const header =
    '# NWRMA unified env — edit here only; run: npm run sync:env (or npm run dev)\n' +
    '# NWRMA_API_URL = URL baked into the field Android APK (must be reachable over the internet).\n'
  fs.writeFileSync(masterPath, serializeEnv(merged, header), 'utf8')
  console.info('[sync-env] Created env/nwrma.env from server/.env + web/.env.local')
}

/** True for office/LAN hosts (192.168.x.x, 10.x, emulator loopback). */
function isPrivateLanUrl(url) {
  if (!url?.trim()) return false
  try {
    const u = new URL(url.trim())
    const host = u.hostname.toLowerCase()
    if (host === 'localhost' || host === '127.0.0.1' || host === '10.0.2.2') return true
    if (/^192\.168\./.test(host)) return true
    if (/^10\./.test(host)) return true
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true
    return false
  } catch {
    return false
  }
}

/** Public HTTPS (or non-LAN HTTP) — works on mobile data, any Wi‑Fi. */
function isPublicInternetUrl(url) {
  return Boolean(url?.trim()) && !isPrivateLanUrl(url)
}

/** First non-internal IPv4 (Wi‑Fi / Ethernet) for field phones on the same LAN. */
function detectLanIpv4() {
  const nets = os.networkInterfaces()
  for (const ifaces of Object.values(nets)) {
    if (!ifaces) continue
    for (const net of ifaces) {
      if (net.family !== 'IPv4' && net.family !== 4) continue
      if (net.internal) continue
      return net.address
    }
  }
  return null
}

function loadMaster() {
  bootstrapMaster()
  if (!fs.existsSync(masterPath)) {
    if (fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, masterPath)
      console.info('[sync-env] Copied env/nwrma.env.example → env/nwrma.env — set NWRMA_API_URL')
    } else {
      throw new Error('Missing env/nwrma.env — create it or add env/nwrma.env.example')
    }
  }
  return parseEnvFile(fs.readFileSync(masterPath, 'utf8'))
}

function writeTargets(map) {
  const port = map.get('PORT') ?? '4000'
  let apiUrl = (map.get('NWRMA_API_URL') ?? '').trim().replace(/\/$/, '')
  let apiLan = (map.get('NWRMA_API_URL_LAN') ?? '').trim().replace(/\/$/, '')

  const detected = detectLanIpv4()
  if (detected) {
    const autoLan = `http://${detected}:${port}`
    apiLan = autoLan
    map.set('NWRMA_API_URL_LAN', apiLan)
  }

  // Web/Next on the laptop still talks to local Express.
  if (!map.get('NWRMA_SERVER_URL')) map.set('NWRMA_SERVER_URL', 'http://localhost:4000')
  map.set('NEXT_PUBLIC_NWRMA_SERVER_URL', map.get('NWRMA_SERVER_URL'))

  const masterBody = serializeEnv(
    map,
    '# NWRMA unified env — edit here only; run: npm run sync:env',
  )
  fs.writeFileSync(masterPath, masterBody, 'utf8')

  fs.writeFileSync(path.join(root, 'server', '.env'), masterBody, 'utf8')

  const webOnly = new Map(map)
  webOnly.set('PUBLIC_APP_URL', map.get('PUBLIC_APP_URL') ?? 'http://localhost:3000')
  fs.writeFileSync(path.join(root, 'web', '.env.local'), serializeEnv(webOnly), 'utf8')

  // FIELD_API_PRIORITY=internet | lan | auto (default auto)
  const priority = (map.get('FIELD_API_PRIORITY') ?? 'auto').trim().toLowerCase()
  const internetFirst =
    priority === 'internet' ||
    (priority !== 'lan' && isPublicInternetUrl(apiUrl))

  let fieldPrimary
  let fieldFallback = ''

  if (internetFirst && apiUrl) {
    fieldPrimary = apiUrl
    if (apiLan && apiLan !== apiUrl) fieldFallback = apiLan
  } else {
    fieldPrimary = apiLan || apiUrl || `http://10.0.2.2:${port}`
    if (apiLan && apiUrl && apiLan !== apiUrl) fieldFallback = apiUrl
  }

  const mobileLines = [
    '# Generated by scripts/sync-env.mjs — do not edit; change env/nwrma.env instead.',
    `EXPO_PUBLIC_NWRMA_SERVER_URL=${fieldPrimary}`,
  ]
  if (fieldFallback) {
    mobileLines.push(`EXPO_PUBLIC_NWRMA_SERVER_URL_FALLBACK=${fieldFallback}`)
  }
  fs.writeFileSync(path.join(root, 'mobile', '.env'), `${mobileLines.join('\n')}\n`, 'utf8')

  console.info(`[sync-env] server/.env, web/.env.local, mobile/.env updated`)
  console.info(
    `[sync-env] Field APK → ${fieldPrimary}${fieldFallback ? ` (fallback ${fieldFallback})` : ''}`,
  )
  if (internetFirst && apiUrl) {
    console.info(
      '[sync-env] Field phones can use mobile data or any Wi‑Fi (public API first). Keep tunnel/server running or deploy API.',
    )
  } else if (apiLan) {
    console.info('[sync-env] Same Wi‑Fi only unless you set NWRMA_API_URL (public) — npm run dev:field for tunnel')
  }
  if (!apiLan && !apiUrl) {
    console.warn('[sync-env] WARNING: set NWRMA_API_URL (public) or run npm run dev:field for tunnel')
  }
}

const map = loadMaster()
writeTargets(map)
