/**
 * Set NWRMA_API_URL in env/nwrma.env (public HTTPS API for field APK).
 * Usage: node scripts/set-public-api-url.mjs https://nwrma-api.onrender.com
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const masterPath = path.join(root, 'env', 'nwrma.env')

const raw = process.argv[2]?.trim()
if (!raw) {
  console.error('Usage: node scripts/set-public-api-url.mjs <https://your-api-host>')
  process.exit(1)
}

let url
try {
  const u = new URL(raw)
  if (u.protocol !== 'https:' && u.protocol !== 'http:') {
    throw new Error('URL must be http or https')
  }
  url = `${u.protocol}//${u.host}`
} catch (e) {
  console.error('Invalid URL:', e instanceof Error ? e.message : e)
  process.exit(1)
}

if (/^https?:\/\/(192\.168\.|10\.|127\.0\.0\.1|localhost)/i.test(url)) {
  console.warn(
    '[set-public-api-url] Warning: this looks like a LAN/local URL. Field phones off-LAN need a public HTTPS host (e.g. Render).'
  )
}

if (!fs.existsSync(masterPath)) {
  console.error(`Missing ${masterPath} — run npm run sync:env first.`)
  process.exit(1)
}

let text = fs.readFileSync(masterPath, 'utf8')
const line = `NWRMA_API_URL=${url}`
if (/^NWRMA_API_URL=/m.test(text)) {
  text = text.replace(/^NWRMA_API_URL=.*$/m, line)
} else {
  text = `${text.trimEnd()}\n${line}\n`
}

if (!/^FIELD_API_PRIORITY=/m.test(text)) {
  text = `${text.trimEnd()}\nFIELD_API_PRIORITY=auto\n`
} else {
  text = text.replace(/^FIELD_API_PRIORITY=.*$/m, 'FIELD_API_PRIORITY=auto')
}

fs.writeFileSync(masterPath, text.endsWith('\n') ? text : `${text}\n`, 'utf8')
console.info(`[set-public-api-url] Updated env/nwrma.env → NWRMA_API_URL=${url}`)
console.info('Next: npm run sync:env && npm run mobile:release')
