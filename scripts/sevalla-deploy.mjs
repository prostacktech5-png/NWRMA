#!/usr/bin/env node
/**
 * Sevalla deploy helper (no app code changes).
 * Validates repo + env, prints dashboard steps, optional post-deploy sync/seed.
 *
 * Usage:
 *   npm run deploy:sevalla
 *   npm run deploy:sevalla -- --seed
 *
 * Dashboard (required first time):
 *   Build strategy = Dockerfile
 *   API: Dockerfile.api | Web: Dockerfile.web
 *   Web volume: /app/web/data
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ENV_FILE = path.join(root, 'env', 'nwrma.env')
const SEVALLA_ENV = path.join(root, 'env', 'sevalla.env')

function log(msg) {
  console.log(`[sevalla-deploy] ${msg}`)
}

function die(msg) {
  console.error(`[sevalla-deploy] ${msg}`)
  process.exit(1)
}

function requireFile(rel, label) {
  const p = path.join(root, rel)
  if (!fs.existsSync(p)) die(`Missing ${label}: ${rel}`)
  return p
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const out = {}
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 1) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

function runNpm(script, extraEnv = {}) {
  const r = spawnSync('npm', ['run', script], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
    shell: true,
  })
  return r.status === 0
}

function main() {
  const args = process.argv.slice(2)
  const doSeed = args.includes('--seed')

  requireFile('Dockerfile', 'Root Dockerfile (web default for Sevalla)')
  requireFile('Dockerfile.api', 'API Dockerfile')
  requireFile('Dockerfile.web', 'Web Dockerfile')
  requireFile('nixpacks.toml', 'Nixpacks web config (fallback)')
  requireFile('nixpacks.api.toml', 'Nixpacks API config (fallback)')

  if (!fs.existsSync(ENV_FILE)) {
    die(`Missing ${ENV_FILE} — copy env/nwrma.env.example and fill secrets.`)
  }

  const env = parseEnvFile(ENV_FILE)
  const sevalla = parseEnvFile(SEVALLA_ENV)
  const apiKey = process.env.SEVALLA_API_KEY?.trim() || sevalla.SEVALLA_API_KEY?.trim()

  log('')
  log('=== Sevalla manual deploy (recommended) ===')
  log('Repo: prostacktech5-png/NWRMA  branch: main')
  log('')
  log('App 1 — nwrma-api')
  log('  Build strategy: Dockerfile')
  log('  Dockerfile path: Dockerfile.api  (not root Dockerfile)')
  log('  Do NOT use default Nixpacks (android app/ breaks cache paths)')
  log('  Env: NODE_ENV=production, HOST=0.0.0.0, DATABASE_URL, JWT_SECRET, FRONTEND_ORIGINS')
  log('')
  log('App 2 — nwrma-web')
  log('  Build strategy: Dockerfile')
  log('  Dockerfile path: Dockerfile  or  Dockerfile.web')
  log('  Volume mount: /app/web/data')
  log('  Env: DATABASE_URL, JWT_SECRET, PUBLIC_APP_URL, NWRMA_SERVER_URL,')
  log('       NEXT_PUBLIC_NWRMA_SERVER_URL, FRONTEND_ORIGINS, INVITE_SECRET, SMTP_*')
  log('')
  log('Nixpacks fallback only: Config file /nixpacks.toml (web) or /nixpacks.api.toml (API)')
  log('')

  if (!apiKey) {
    log('SEVALLA_API_KEY not set — finish deploy in Sevalla dashboard, then run:')
    log('  node scripts/set-public-api-url.mjs https://YOUR-API-HOST')
    log('  npm run sync:env')
    if (doSeed) log('  npm run db:seed')
    log('')
    log('Optional: copy env/sevalla.env.example → env/sevalla.env and set SEVALLA_API_KEY')
    process.exit(0)
  }

  log('SEVALLA_API_KEY is set — use Sevalla dashboard to trigger deploy from GitHub.')
  log('(Sevalla REST deploy varies by account; Dockerfile + Git connect is the stable path.)')

  const apiUrl = env.NWRMA_API_URL?.startsWith('https://') ? env.NWRMA_API_URL.replace(/\/$/, '') : null
  if (apiUrl) {
    spawnSync('node', ['scripts/set-public-api-url.mjs', apiUrl], { cwd: root, stdio: 'inherit', shell: true })
  }

  runNpm('sync:env')

  if (doSeed && env.DATABASE_URL) {
    log('Seeding database...')
    runNpm('db:seed', { DATABASE_URL: env.DATABASE_URL })
  }

  log('')
  log('After Sevalla shows live URLs, update env/nwrma.env and run:')
  log('  node scripts/set-public-api-url.mjs https://<api-host>')
  log('  npm run sync:env')
  log('  npm run deploy:sevalla -- --seed')
  log('')
  log('Verify: https://<api>/health  and  https://<web>/login')
}

main()
