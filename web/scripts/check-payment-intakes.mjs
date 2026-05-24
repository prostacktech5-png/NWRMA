import postgres from 'postgres'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '..', '.env.local')
const env = readFileSync(envPath, 'utf8')
const url = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '')
if (!url) {
  console.error('DATABASE_URL missing in web/.env.local')
  process.exit(1)
}

const sql = postgres(url, { max: 1, prepare: false })
const rows = await sql`
  SELECT payload, updated_at FROM erp_reference_snapshot WHERE id = 'global'
`
let payload = rows[0]?.payload
if (typeof payload === 'string') {
  try {
    payload = JSON.parse(payload)
  } catch {
    console.log('payload is string, parse failed')
  }
}
console.log('payload type:', typeof payload)
const keys = payload && typeof payload === 'object' ? Object.keys(payload) : []
const intakes = payload?.onlineFormPaymentIntakes ?? []
console.log('updated_at:', rows[0]?.updated_at)
console.log('payload keys include onlineFormPaymentIntakes:', keys.includes('onlineFormPaymentIntakes'))
console.log('intake count:', Array.isArray(intakes) ? intakes.length : typeof intakes)
if (payload && !keys.includes('onlineFormPaymentIntakes')) {
  console.log('sample keys:', keys.slice(0, 15).join(', '))
}
for (const i of intakes) {
  console.log('-', i.intakeReference, i.formSlug, i.organisationName, i.bankReceiptValidation?.status)
}
await sql.end()
