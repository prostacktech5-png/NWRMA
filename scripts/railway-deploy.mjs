#!/usr/bin/env node
/**
 * Deploy nwrma-api and nwrma-web to Railway using Docker config + env/nwrma.env.
 *
 * Usage:
 *   set RAILWAY_TOKEN=<project-token>
 *   npm run deploy:railway
 *
 * Optional: RAILWAY_PROJECT_ID=1bcb7582-9ac2-407e-a36c-bf70c42f7627
 */
import { execSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PROJECT_ID = process.env.RAILWAY_PROJECT_ID?.trim() || '1bcb7582-9ac2-407e-a36c-bf70c42f7627'
const ENV_FILE = path.join(root, 'env', 'nwrma.env')
const CLI = 'npx --yes @railway/cli@4'

function log(msg) {
  console.log(`[railway-deploy] ${msg}`)
}

function run(cmd, opts = {}) {
  log(`$ ${cmd}`)
  execSync(cmd, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...opts.env },
    ...opts,
  })
}

function runCapture(cmd) {
  return execSync(cmd, {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
  }).trim()
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${filePath} — copy from env/nwrma.env.example and fill secrets.`)
  }
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

function setServiceVariables(serviceName, vars) {
  const pairs = Object.entries(vars).filter(([, v]) => v != null && String(v).length > 0)
  for (const [k, v] of pairs) {
    log(`variable set ${k} on ${serviceName}`)
    const r = spawnSync(
      'npx',
      ['--yes', '@railway/cli@4', 'variable', 'set', k, '--stdin', '--service', serviceName, '--skip-deploys'],
      { cwd: root, input: String(v), stdio: ['pipe', 'inherit', 'inherit'], env: process.env, shell: true }
    )
    if (r.status !== 0) {
      throw new Error(`Failed to set ${k} on ${serviceName}`)
    }
  }
}

function getServiceDomain(serviceName) {
  try {
    const out = runCapture(`${CLI} domain --service "${serviceName}" --json 2>nul || ${CLI} status --json`)
    const parsed = JSON.parse(out)
    const domains = parsed?.domains ?? parsed?.service?.domains ?? []
    if (Array.isArray(domains) && domains.length > 0) {
      const d = domains[0]
      return typeof d === 'string' ? d : d?.domain ?? d?.url
    }
    if (parsed?.url) return parsed.url.replace(/\/$/, '')
  } catch {
    /* fallback below */
  }
  try {
    const text = runCapture(`${CLI} status --service "${serviceName}"`)
    const m = text.match(/https:\/\/[a-z0-9-]+\.up\.railway\.app/i)
    if (m) return m[0]
  } catch {
    /* ignore */
  }
  return null
}

function deployService(serviceName, configFile) {
  const configSrc = path.join(root, configFile)
  const configDst = path.join(root, 'railway.toml')
  fs.copyFileSync(configSrc, configDst)
  log(`Using ${configFile} -> railway.toml for ${serviceName}`)
  run(`${CLI} up --detach --service "${serviceName}"`)
}

async function waitHealth(url, label, maxSec = 300) {
  const healthUrl = `${url.replace(/\/$/, '')}/health`
  log(`Waiting for ${label} at ${healthUrl} (up to ${maxSec}s)...`)
  const start = Date.now()
  while (Date.now() - start < maxSec * 1000) {
    try {
      const res = await fetch(healthUrl, { signal: AbortSignal.timeout(15000) })
      if (res.ok) {
        log(`${label} is up.`)
        return true
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 10000))
  }
  log(`${label} not healthy yet — check Railway build logs.`)
  return false
}

function main() {
  if (!process.env.RAILWAY_TOKEN?.trim()) {
    console.error(`
Missing RAILWAY_TOKEN.

1. Railway → Project → Settings → Tokens → Create Project Token
2. PowerShell:
   $env:RAILWAY_TOKEN="your-token-here"
   npm run deploy:railway
`)
    process.exit(1)
  }

  const env = parseEnvFile(ENV_FILE)

  log('Linking Railway project...')
  try {
    run(`${CLI} link -p ${PROJECT_ID}`)
  } catch {
    log('Link may already exist; continuing.')
  }

  const apiVars = {
    NODE_ENV: 'production',
    HOST: '0.0.0.0',
    DATABASE_URL: env.DATABASE_URL,
    JWT_SECRET: env.JWT_SECRET,
    FRONTEND_ORIGINS: env.FRONTEND_ORIGINS || env.PUBLIC_APP_URL || '',
    SEED_WEB_ADMIN_EMAIL: env.SEED_WEB_ADMIN_EMAIL,
    SEED_WEB_ADMIN_PASSWORD: env.SEED_WEB_ADMIN_PASSWORD,
    SEED_MOBILE_OFFICER_PHONE: env.SEED_MOBILE_OFFICER_PHONE,
    SEED_MOBILE_OFFICER_PASSWORD: env.SEED_MOBILE_OFFICER_PASSWORD,
  }

  log('Setting variables on nwrma-api...')
  setServiceVariables('nwrma-api', apiVars)

  log('Deploying nwrma-api (Dockerfile.api)...')
  deployService('nwrma-api', 'railway.api.toml')

  let apiUrl =
    env.NWRMA_API_URL?.startsWith('https://') ? env.NWRMA_API_URL.replace(/\/$/, '') : null
  if (!apiUrl) {
    apiUrl = getServiceDomain('nwrma-api')
  }
  if (apiUrl) {
    log(`API URL: ${apiUrl}`)
    run(`node scripts/set-public-api-url.mjs "${apiUrl}"`)
  }

  const webUrlGuess = env.PUBLIC_APP_URL?.startsWith('https://')
    ? env.PUBLIC_APP_URL.replace(/\/$/, '')
    : getServiceDomain('nwrma-web')

  const webVars = {
    NODE_ENV: 'production',
    DATABASE_URL: env.DATABASE_URL,
    JWT_SECRET: env.JWT_SECRET,
    PUBLIC_APP_URL: webUrlGuess || 'https://nwrma-web-production.up.railway.app',
    NWRMA_SERVER_URL: apiUrl || env.NWRMA_SERVER_URL,
    NEXT_PUBLIC_NWRMA_SERVER_URL: apiUrl || env.NEXT_PUBLIC_NWRMA_SERVER_URL,
    FRONTEND_ORIGINS: env.FRONTEND_ORIGINS || webUrlGuess || '',
    INVITE_SECRET: env.INVITE_SECRET,
    INVITE_EXPIRY_DAYS: env.INVITE_EXPIRY_DAYS,
    APP_PUBLIC_NAME: env.APP_PUBLIC_NAME,
    SMTP_HOST: env.SMTP_HOST,
    SMTP_PORT: env.SMTP_PORT,
    SMTP_SECURE: env.SMTP_SECURE,
    SMTP_USER: env.SMTP_USER,
    SMTP_PASS: env.SMTP_PASS,
    SMTP_FROM: env.SMTP_FROM,
  }

  if (apiUrl && webUrlGuess) {
    apiVars.FRONTEND_ORIGINS = webUrlGuess
    setServiceVariables('nwrma-api', { FRONTEND_ORIGINS: webUrlGuess })
  }

  log('Setting variables on nwrma-web...')
  setServiceVariables('nwrma-web', webVars)

  log('Deploying nwrma-web (Dockerfile.web)...')
  deployService('nwrma-web', 'railway.web.toml')

  const finalWeb = getServiceDomain('nwrma-web') || webUrlGuess
  const finalApi = getServiceDomain('nwrma-api') || apiUrl

  if (finalWeb && finalApi) {
    setServiceVariables('nwrma-web', {
      PUBLIC_APP_URL: finalWeb,
      NWRMA_SERVER_URL: finalApi,
      NEXT_PUBLIC_NWRMA_SERVER_URL: finalApi,
      FRONTEND_ORIGINS: env.FRONTEND_ORIGINS || `${finalWeb},http://localhost:3000`,
    })
    setServiceVariables('nwrma-api', { FRONTEND_ORIGINS: finalWeb })
    run(`node scripts/set-public-api-url.mjs "${finalApi}"`)
  }

  run('npm run sync:env')

  log('Seeding database (production DATABASE_URL from env/nwrma.env)...')
  const seed = spawnSync('npm', ['run', 'db:seed'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: env.DATABASE_URL },
    shell: true,
  })
  if (seed.status !== 0) {
    log('db:seed failed — run manually: npm run db:seed')
  }

  if (finalApi) {
    waitHealth(finalApi, 'API').then((ok) => {
      if (finalWeb) waitHealth(finalWeb.replace(/\/$/, '') + '/api/health/db', 'Web DB', 120).catch(() => {})
      log(`
Done. Before 9am presentation:
  API:  ${finalApi}/health
  Web:  ${finalWeb}/login
  Pre-warm both ~1 minute before presenting.
  APK:  npm run mobile:release  (if time) or use dev:field:lan on laptop
`)
      process.exit(ok ? 0 : 1)
    })
  } else {
    log('Deploy triggered. Check Railway dashboard for URLs.')
  }
}

main()
