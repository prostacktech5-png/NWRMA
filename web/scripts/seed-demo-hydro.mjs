/**
 * Smoke tests against running Next.js dev server (npm run dev).
 * Usage: BASE_URL=http://127.0.0.1:3000 node scripts/seed-demo-hydro.mjs
 *
 * Uses fetch with an abort timeout so CI agents do not hang if the server is down.
 */

const base = process.env.BASE_URL || 'http://127.0.0.1:3000'
const TIMEOUT_MS = 15_000

function url(path) {
  return new URL(path, base).toString()
}

async function fetchTimeout(resource, options = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    return await fetch(resource, { ...options, signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

async function expectOk(res, label) {
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`${label}: ${res.status} ${t}`)
  }
}

async function main() {
  console.info('[hydro-smoke] base =', base)

  let r = await fetchTimeout(url('/api/hydrological/readings'))
  await expectOk(r, 'GET readings')
  const readings = (await r.json()).readings
  console.info('[hydro-smoke] readings count', readings.length)

  const reportUrl = url(
    '/api/hydrological/activity-report?from=2024-03-01&to=2024-03-31&sections=readings,payments,budget'
  )
  r = await fetchTimeout(reportUrl, { headers: { 'X-Acting-User-Id': 'user-003' } })
  await expectOk(r, 'GET activity-report (hydrological HOD)')
  const rep = await r.json()
  if (!rep.meta?.periodLabel) throw new Error('activity-report missing meta.periodLabel')
  if (!Array.isArray(rep.meta.includedSections)) {
    throw new Error('activity-report missing meta.includedSections')
  }
  console.info('[hydro-smoke] activity-report period', rep.meta.periodLabel)

  r = await fetchTimeout(reportUrl, { headers: { 'X-Acting-User-Id': 'user-004' } })
  if (r.status !== 403) {
    const t = await r.text()
    throw new Error(`Expected 403 for non-hydro user on activity-report, got ${r.status} ${t}`)
  }
  console.info('[hydro-smoke] activity-report → 403 for non-hydro user OK')

  r = await fetchTimeout(url('/api/hydrological/payments'))
  await expectOk(r, 'GET payments')
  const pay0 = await r.json()
  const submitted = pay0.payments.find((p) => p.status === 'submitted')
  if (!submitted) throw new Error('Expected a submitted seed payment row')

  r = await fetchTimeout(url(`/api/hydrological/payments/${submitted.id}/approve`), {
    method: 'POST',
  })
  await expectOk(r, 'POST approve (first)')
  r = await fetchTimeout(url(`/api/hydrological/payments/${submitted.id}/approve`), {
    method: 'POST',
  })
  if (r.status !== 409) {
    const t = await r.text()
    throw new Error(`Expected 409 on double approve, got ${r.status} ${t}`)
  }
  console.info('[hydro-smoke] double approve → 409 OK')

  r = await fetchTimeout(url(`/api/hydrological/payments/${submitted.id}/disburse`), {
    method: 'POST',
  })
  await expectOk(r, 'POST disburse (after approved)')
  r = await fetchTimeout(url(`/api/hydrological/payments/${submitted.id}/disburse`), {
    method: 'POST',
  })
  if (r.status !== 409) {
    const t = await r.text()
    throw new Error(`Expected 409 on double disburse, got ${r.status} ${t}`)
  }
  console.info('[hydro-smoke] double disburse → 409 OK')

  r = await fetchTimeout(url('/api/field/payments/summary'), {
    headers: {
      'X-Field-App-Key': 'demo-field-app-key',
      'X-Gauge-Officer-Id': 'go-001',
    },
  })
  await expectOk(r, 'GET field summary')
  const summary = await r.json()
  console.info('[hydro-smoke] field officer', summary.officer?.fullName)

  r = await fetchTimeout(url('/api/hydrological/payments/metrics'))
  await expectOk(r, 'GET payments/metrics')

  console.info('[hydro-smoke] all checks passed')
}

main().catch((e) => {
  console.error('[hydro-smoke] FAILED:', e.message)
  process.exit(1)
})
