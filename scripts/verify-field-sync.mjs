/**
 * Quick check that Express (mobile sync) and ERP Next.js are reachable.
 * Run from repo root: npm run verify:field-sync
 *
 * Env overrides:
 *   VERIFY_ERP_URL — single URL to test for ERP (e.g. http://127.0.0.1:3001)
 *   VERIFY_EXPRESS_URL — Express health URL (default http://127.0.0.1:4000/health)
 */
function explainErr(e, depth = 0) {
  if (depth > 5) return '…'
  if (e == null) return ''
  if (e instanceof Error) {
    const code = 'code' in e && e.code ? ` [${e.code}]` : ''
    const inner = e.cause != null ? `: ${explainErr(e.cause, depth + 1)}` : ''
    return `${e.message}${code}${inner}`
  }
  return String(e)
}

async function fetchOk(url, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 15000
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { Accept: 'text/html,application/json' },
    })
    clearTimeout(t)
    const txt = url.includes('/health')
      ? await r.text().catch(() => '')
      : ''
    const healthOk = url.includes('/health')
      ? r.ok && (txt.includes('ok') || txt.includes('"ok"'))
      : r.ok
    return { ok: healthOk, status: r.status, url, error: null }
  } catch (e) {
    clearTimeout(t)
    const aborted =
      e instanceof Error &&
      (e.name === 'AbortError' || e.message.includes('abort'))
    return {
      ok: false,
      status: 0,
      url,
      error: aborted ? `timed out after ${timeoutMs}ms` : explainErr(e),
    }
  }
}

const expressUrl =
  process.env.VERIFY_EXPRESS_URL ?? 'http://127.0.0.1:4000/health'

const erpCandidates = process.env.VERIFY_ERP_URL
  ? [process.env.VERIFY_ERP_URL.replace(/\/$/, '')]
  : [
      'http://127.0.0.1:3000',
      'http://localhost:3000',
      'http://127.0.0.1:3001',
      'http://localhost:3001',
    ]

console.log('Checking field-sync endpoints…\n')

const ex = await fetchOk(expressUrl)
if (ex.ok) {
  console.log(`✓ Express API → ${ex.status} (${expressUrl})`)
} else {
  console.log(
    `✗ Express API → ${ex.error ?? `HTTP ${ex.status}`} (${expressUrl})`
  )
}

let erpOk = false
let erpHit = ''
let lastErpErr = ''

for (const base of erpCandidates) {
  const r = await fetchOk(base, { timeoutMs: 15000 })
  lastErpErr = r.error ?? ''
  if (r.ok) {
    console.log(`✓ ERP web → ${r.status} (${base})`)
    erpOk = true
    erpHit = base
    break
  }
}

if (!erpOk) {
  console.log(
    `✗ ERP web → not reachable on ${erpCandidates.join(', ')}`
  )
  if (lastErpErr) console.log(`   Typical cause: ${lastErpErr}`)
}

console.log('')
const allOk = ex.ok && erpOk

if (allOk) {
  console.log(
    'Both services respond.\n' +
      '- Expo mobile: EXPO_PUBLIC_NWRMA_SERVER_URL → Express :4000\n' +
      '- Android field Next: android app/.env.local NWRMA_WEB_ORIGIN → ERP (HYDRO_API_KEY matches web/.env.local)\n' +
      '- Shared DB: web/.env.local and server/.env DATABASE_URL'
  )
  process.exit(0)
}

console.log(
  'Fix:\n' +
    '  1) From repo root start BOTH:  npm run dev\n' +
    '     If you pressed Ctrl+C earlier, Next.js stopped — ERP checks fail until you restart.\n' +
    '  2) ERP should be on :3000 (see web/package.json next dev -p 3000).\n' +
    '  3) Custom ERP URL:  set VERIFY_ERP_URL=http://127.0.0.1:PORT\n' +
    '\n' +
    'Emulator / Expo reload:\n' +
    '  • Metro terminal: press R twice, or a — open Android.\n' +
    '  • Emulator cold boot: Android Studio → Device Manager → AVD ⋮ → Cold Boot Now.\n'
)
process.exit(1)
