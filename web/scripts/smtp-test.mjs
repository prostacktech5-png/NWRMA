/**
 * Quick SMTP check using vars from `.env.local`.
 * Run: npm run smtp-test  (requires Node 20.6+ for --env-file)
 */

import nodemailer from 'nodemailer'

function cfg() {
  const host = process.env.SMTP_HOST?.trim()
  const user = process.env.SMTP_USER?.trim()
  const pass = (process.env.SMTP_PASS ?? '').replace(/\s+/g, '')
  const port = Number(process.env.SMTP_PORT ?? '465')
  const secure =
    process.env.SMTP_SECURE === 'true' ||
    process.env.SMTP_SECURE === '1' ||
    port === 465
  const from =
    process.env.SMTP_FROM?.trim() || user || ''

  return { host, user, pass, port, secure, from }
}

async function main() {
  const c = cfg()
  if (!c.host || !c.user || !c.pass) {
    console.error('Missing SMTP_HOST / SMTP_USER / SMTP_PASS in .env.local')
    process.exit(1)
  }

  const tx = nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.secure,
    auth: { user: c.user, pass: c.pass },
  })

  console.log('Verifying SMTP connection...')
  await tx.verify()
  console.log('OK: SMTP accepts credentials.')

  const testTo = process.env.SMTP_TEST_TO?.trim() || c.user
  console.log(`Sending test message to ${testTo} ...`)

  await tx.sendMail({
    from: c.from,
    to: testTo,
    subject: 'NWRMA ERP — SMTP test',
    text: 'If you see this, SMTP from .env.local is working.',
    html: '<p>If you see this, SMTP from <code>.env.local</code> is working.</p>',
  })

  console.log('OK: Test email sent.')
}

main().catch((err) => {
  console.error('SMTP test failed:', err.message ?? err)
  process.exit(1)
})
