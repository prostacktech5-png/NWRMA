#!/usr/bin/env node
/**
 * Loads `server/.env` (+ optional `.env.local`) into process.env before invoking Prisma.
 * Gives a clear error when DATABASE_URL is missing (fixes P1012 from an empty shell).
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const serverRoot = path.resolve(__dirname, '..')

// Allow `server/.env` (and overrides) to win over stray process env (e.g. a
// machine-level DATABASE_URL to Supabase Transaction pooler, which breaks
// `migrate` with prepared-statement errors on PgBouncer).
dotenv.config({ path: path.join(serverRoot, '.env'), override: true })
dotenv.config({ path: path.join(serverRoot, '.env.local'), override: true })

const prismaArgs = process.argv.slice(2)
if (!prismaArgs.length) {
  console.error('Usage: node scripts/run-prisma.mjs <prisma subcommand ...>')
  process.exit(1)
}

if (!process.env.DATABASE_URL?.trim()) {
  console.error(`
Missing DATABASE_URL.

1. Copy "${path.join(serverRoot, '.env.example')}" to "${path.join(serverRoot, '.env')}".
2. Set DATABASE_URL to your Supabase Postgres connection string (pooler URI with ?sslmode=require).

Docs: README.md ("Configure Supabase")
`)
  process.exit(1)
}

if (process.env.DATABASE_URL.includes('REPLACE_WITH_DATABASE_PASSWORD')) {
  console.error(`
DATABASE_URL still contains REPLACE_WITH_DATABASE_PASSWORD.

Supabase → Project Settings → Database → Database password (not the anon JWT or REST secret keys).
Replace that substring with your Postgres password (URL-encode @, #, :, etc. if needed).
`)
  process.exit(1)
}

const result = spawnSync('npx', ['prisma', ...prismaArgs], {
  cwd: serverRoot,
  stdio: 'inherit',
  env: process.env,
  shell: true,
})

process.exit(result.status === null ? 1 : result.status)
