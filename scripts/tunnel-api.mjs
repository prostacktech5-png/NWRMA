/**
 * Exposes local Express (PORT) to the internet for field Android testing.
 * Uses cloudflared (trycloudflare.com) — more reliable than localtunnel for mobile.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const masterPath = path.join(root, 'env', 'nwrma.env')
const port = Number(process.env.PORT ?? 4000)

function waitForPort(ms = 120_000) {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const tick = () => {
      fetch(`http://127.0.0.1:${port}/health`)
        .then((r) => (r.ok ? resolve() : Promise.reject()))
        .catch(() => {
          if (Date.now() - start > ms) reject(new Error(`API not up on port ${port} after ${ms}ms`))
          else setTimeout(tick, 1500)
        })
    }
    tick()
  })
}

function patchEnvLine(text, key, value) {
  const line = `${key}=${value}`
  if (new RegExp(`^${key}=`, 'm').test(text)) {
    return text.replace(new RegExp(`^${key}=.*$`, 'm'), line)
  }
  return `${line}\n${text}`
}

function patchNwrmaApiUrl(publicUrl) {
  let text = fs.readFileSync(masterPath, 'utf8')
  text = patchEnvLine(text, 'NWRMA_API_URL', publicUrl)
  text = patchEnvLine(text, 'FIELD_API_PRIORITY', 'internet')
  fs.writeFileSync(masterPath, text, 'utf8')
}

function findCloudflaredBin() {
  const candidates = [
    process.env.CLOUDFLARED_PATH,
    'cloudflared',
    'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
    'C:\\Program Files\\cloudflared\\cloudflared.exe',
  ].filter(Boolean)
  for (const c of candidates) {
    if (c.includes(path.sep) && fs.existsSync(c)) return c
    return c
  }
  return 'cloudflared'
}

async function main() {
  if (!fs.existsSync(masterPath)) {
    await import('./sync-env.mjs')
  }

  console.info(`[tunnel] Waiting for http://127.0.0.1:${port}/health …`)
  await waitForPort()

  const bin = findCloudflaredBin()
  const cf = spawn(
    bin,
    ['tunnel', '--url', `http://127.0.0.1:${port}`, '--no-autoupdate'],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  )

  let url = ''
  const tryParse = (s) => {
    const m = s.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i)
    if (m) url = m[0].replace(/\/$/, '')
  }

  const onData = (buf) => {
    const s = buf.toString()
    process.stdout.write(s)
    tryParse(s)
  }
  cf.stdout.on('data', onData)
  cf.stderr.on('data', onData)

  const deadline = Date.now() + 45_000
  while (!url && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 500))
  }

  if (!url) {
    console.error('[tunnel] No trycloudflare.com URL in cloudflared output. Install cloudflared or set CLOUDFLARED_PATH.')
    cf.kill()
    process.exit(1)
  }

  patchNwrmaApiUrl(url)
  await import('./sync-env.mjs')

  // Verify tunnel reaches our API
  try {
    const probe = await fetch(`${url}/health`, {
      headers: { 'User-Agent': 'HydroGaugeSL/1.0' },
    })
    if (!probe.ok) {
      console.warn(`[tunnel] Warning: ${url}/health returned ${probe.status}`)
    } else {
      console.info(`[tunnel] Verified ${url}/health OK`)
    }
  } catch (e) {
    console.warn('[tunnel] Health check via public URL failed:', e.message ?? e)
  }

  console.info('\n[tunnel] Public API URL for field phones (mobile data OK):', url)
  console.info('[tunnel] Rebuild and install APK: npm run mobile:release')
  console.info('[tunnel] Keep this terminal running while officers sync.\n')

  process.on('SIGINT', () => {
    cf.kill()
    process.exit(0)
  })
}

main().catch((e) => {
  console.error('[tunnel]', e.message ?? e)
  process.exit(1)
})
