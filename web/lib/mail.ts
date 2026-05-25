import nodemailer from 'nodemailer'
import { resolvePublicAppBaseUrl } from '@/lib/form-resume-token'

export type SmtpConfig = {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
}

export function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim()
  const user = process.env.SMTP_USER?.trim()
  const rawPass = process.env.SMTP_PASS ?? ''
  /** Gmail App Passwords may contain spaces — strip them. */
  const pass = rawPass.replace(/\s+/g, '')
  if (!host || !user || !pass) return null

  const port = Number(process.env.SMTP_PORT ?? '465')
  const secure =
    process.env.SMTP_SECURE === 'true' ||
    process.env.SMTP_SECURE === '1' ||
    port === 465

  const rawFrom = process.env.SMTP_FROM?.trim()
  const from = rawFrom && rawFrom.length > 0 ? rawFrom : `"NWRMA ERP" <${user}>`

  return { host, port: Number.isFinite(port) ? port : 465, secure, user, pass, from }
}

export function isSmtpConfigured(): boolean {
  return getSmtpConfig() !== null
}

export type MailAttachment = {
  filename: string
  content: Buffer
  contentType?: string
}

export async function sendMailMessage(opts: {
  to: string
  cc?: string
  subject: string
  text: string
  html: string
  attachments?: MailAttachment[]
}): Promise<void> {
  const cfg = getSmtpConfig()
  if (!cfg) throw new Error('SMTP not configured')

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  })

  await transporter.sendMail({
    from: cfg.from,
    to: opts.to,
    cc: opts.cc,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    attachments: opts.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType ?? 'application/octet-stream',
    })),
  })
}

export function inviteSetPasswordUrl(rawToken: string): string {
  return `${resolvePublicAppBaseUrl()}/set-password?token=${encodeURIComponent(rawToken)}`
}

export async function sendPasswordInviteEmail(params: {
  to: string
  fullName: string
  inviteUrl: string
  appLabel?: string
}): Promise<void> {
  const label = params.appLabel?.trim() || 'NWRMA ERP'
  const subject = `${label}: set up your password`
  const text = [
    `Hello ${params.fullName},`,
    '',
    `You've been invited to ${label}. Use the link below to choose your password and start using the system:`,
    '',
    params.inviteUrl,
    '',
    'If you did not expect this message, you can ignore it.',
  ].join('\n')

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;">
  <p>Hello <strong>${escapeHtml(params.fullName)}</strong>,</p>
  <p>You've been invited to <strong>${escapeHtml(label)}</strong>. Click the button below to set your password and access the system.</p>
  <p style="margin:24px 0;">
    <a href="${escapeHtml(params.inviteUrl)}" style="background:#0072C6;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">
      Set up password
    </a>
  </p>
  <p style="font-size:13px;color:#555;">Or paste this link into your browser:<br/><span style="word-break:break-all;">${escapeHtml(params.inviteUrl)}</span></p>
  <p style="font-size:13px;color:#777;">If you did not expect this email, you can ignore it.</p>
</body>
</html>`

  await sendMailMessage({ to: params.to, subject, text, html })
}

export async function sendAdminInviteNotification(params: {
  invitedEmail: string
  invitedName: string
  role: string
  appLabel?: string
}): Promise<void> {
  const notifyTo = process.env.SMTP_NOTIFY_TO?.trim()
  if (!notifyTo) return

  const label = params.appLabel?.trim() || 'NWRMA ERP'
  const subject = `${label}: user invitation sent`
  const text = [
    `An invitation email was sent from ${label}.`,
    '',
    `Name: ${params.invitedName}`,
    `Email: ${params.invitedEmail}`,
    `Role: ${params.role}`,
  ].join('\n')

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;">
  <p><strong>${escapeHtml(label)}</strong> — invitation notification</p>
  <ul>
    <li><strong>Name:</strong> ${escapeHtml(params.invitedName)}</li>
    <li><strong>Email:</strong> ${escapeHtml(params.invitedEmail)}</li>
    <li><strong>Role:</strong> ${escapeHtml(params.role)}</li>
  </ul>
</body>
</html>`

  await sendMailMessage({ to: notifyTo, subject, text, html })
}

export function escapeHtml(s: string | null | undefined): string {
  const value = s ?? ''
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

type LicenseEmailBase = {
  to: string
  cc?: string
  contactName: string
  organisationName: string
  reference: string
  reviewNote?: string | null
  /** Link to reopen the same online form and resubmit (additional info workflow). */
  amendUrl?: string | null
}

async function sendLicenseEmail(
  base: LicenseEmailBase,
  subject: string,
  bodyParagraphs: string[]
): Promise<void> {
  const greeting = `Hello ${base.contactName || 'Applicant'},`
  const amendUrl = base.amendUrl?.trim() ?? ''
  const text = [
    greeting,
    '',
    ...bodyParagraphs,
    '',
    `Application reference: ${base.reference}`,
    `Organisation: ${base.organisationName}`,
    base.reviewNote?.trim()
      ? `\nMessage from NWRMA:\n${base.reviewNote.trim()}`
      : '',
    amendUrl
      ? `\nComplete and resubmit your application using this link (same form as your original submission):\n${amendUrl}`
      : '',
    '',
    'National Water Resources Management Agency — Sierra Leone',
    'https://nwrma.gov.sl',
  ]
    .filter(Boolean)
    .join('\n')

  const htmlBody = bodyParagraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('')
  const noteBlock = base.reviewNote?.trim()
    ? `<p style="margin-top:16px;padding:12px;background:#f4f6f8;border-radius:8px;white-space:pre-wrap;"><strong>Message from NWRMA:</strong><br/>${escapeHtml(base.reviewNote.trim())}</p>`
    : ''
  const amendBlock = amendUrl
    ? `<p style="margin:20px 0;">
    <a href="${escapeHtml(amendUrl)}" style="display:inline-block;padding:12px 20px;background:#0072C6;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
      Open application form
    </a>
  </p>
  <p style="font-size:12px;color:#555;">Use the same online form layout as before. Fields that were missing have been left blank for you to complete, then resubmit for review.</p>`
    : ''

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;max-width:560px;">
  <p>Hello <strong>${escapeHtml(base.contactName)}</strong>,</p>
  ${htmlBody}
  ${noteBlock}
  ${amendBlock}
  <p style="font-size:13px;color:#555;margin-top:20px;">
    <strong>Reference:</strong> ${escapeHtml(base.reference)}<br/>
    <strong>Organisation:</strong> ${escapeHtml(base.organisationName)}
  </p>
  <p style="font-size:13px;color:#777;margin-top:24px;">National Water Resources Management Agency — Sierra Leone</p>
</body>
</html>`

  await sendMailMessage({ to: base.to, cc: base.cc, subject, text, html })
}

export async function sendDamSafetyApplicationReceivedEmail(base: LicenseEmailBase): Promise<void> {
  await sendLicenseEmail(
    base,
    `NWRMA: Dam safety application received — ${base.reference}`,
    [
      `Thank you. We have received your Dam Safety application for ${base.organisationName}.`,
      'NWRMA will review your submission and contact you if additional information is required.',
      'Average processing time is within three (3) months from the date of receipt, provided the application is complete.',
    ]
  )
}

export async function sendDamSafetyStatusEmail(
  base: LicenseEmailBase,
  status: 'additional_info_required' | 'approved' | 'rejected'
): Promise<void> {
  const subjects = {
    additional_info_required: `NWRMA: Additional information required — ${base.reference}`,
    approved: `NWRMA: Dam safety application approved — ${base.reference}`,
    rejected: `NWRMA: Dam safety application outcome — ${base.reference}`,
  }
  const bodies = {
    additional_info_required: [
      `We are reviewing your Dam Safety application for ${base.organisationName}.`,
      'Additional information is required before we can continue processing.',
      base.amendUrl
        ? 'Open your application using the button below, complete the missing sections in the same form format, and resubmit for review.'
        : 'Please contact NWRMA with the requested information as soon as possible.',
    ],
    approved: [
      `Your Dam Safety application (${base.reference}) for ${base.organisationName} has been approved.`,
      'NWRMA will contact you regarding licence issuance and any remaining administrative steps.',
    ],
    rejected: [
      `After review, your Dam Safety application (${base.reference}) for ${base.organisationName} has not been approved at this time.`,
    ],
  }
  await sendLicenseEmail(base, subjects[status], bodies[status])
}

export async function sendEffluentDischargeApplicationReceivedEmail(
  base: LicenseEmailBase
): Promise<void> {
  await sendLicenseEmail(
    base,
    `NWRMA: Effluent discharge application received — ${base.reference}`,
    [
      `Thank you. We have received your Effluent Discharge application for ${base.organisationName}.`,
      'NWRMA will review your submission and contact you if additional information is required.',
      'Average processing time is within three (3) months from the date of receipt, provided the application is complete.',
    ]
  )
}

export async function sendEffluentDischargeStatusEmail(
  base: LicenseEmailBase,
  status: 'additional_info_required' | 'approved' | 'rejected'
): Promise<void> {
  const subjects = {
    additional_info_required: `NWRMA: Additional information required — ${base.reference}`,
    approved: `NWRMA: Effluent discharge application approved — ${base.reference}`,
    rejected: `NWRMA: Effluent discharge application outcome — ${base.reference}`,
  }
  const bodies = {
    additional_info_required: [
      `We are reviewing your Effluent Discharge application for ${base.organisationName}.`,
      'Additional information is required before we can continue processing.',
      base.amendUrl
        ? 'Open your application using the button below, complete the missing sections in the same form format, and resubmit for review.'
        : 'Please contact NWRMA with the requested information as soon as possible.',
    ],
    approved: [
      `Your Effluent Discharge application (${base.reference}) for ${base.organisationName} has been approved.`,
      'NWRMA will contact you regarding permit issuance and any remaining administrative steps.',
    ],
    rejected: [
      `After review, your Effluent Discharge application (${base.reference}) for ${base.organisationName} has not been approved at this time.`,
    ],
  }
  await sendLicenseEmail(base, subjects[status], bodies[status])
}

export async function sendWaterRightApplicationReceivedEmail(
  base: LicenseEmailBase
): Promise<void> {
  await sendLicenseEmail(
    base,
    `NWRMA: Water right application received — ${base.reference}`,
    [
      `Thank you. We have received your Water Right application for ${base.organisationName}.`,
      'NWRMA will review your submission and contact you if additional information is required.',
      'Average processing time is within three (3) months from the date of receipt, provided the application is complete.',
    ]
  )
}

export async function sendWaterRightStatusEmail(
  base: LicenseEmailBase,
  status: 'additional_info_required' | 'approved' | 'rejected'
): Promise<void> {
  const subjects = {
    additional_info_required: `NWRMA: Additional information required — ${base.reference}`,
    approved: `NWRMA: Water right application approved — ${base.reference}`,
    rejected: `NWRMA: Water right application outcome — ${base.reference}`,
  }
  const bodies = {
    additional_info_required: [
      `We are reviewing your Water Right application for ${base.organisationName}.`,
      'Additional information is required before we can continue processing.',
      base.amendUrl
        ? 'Open your application using the button below, complete the missing sections in the same form format, and resubmit for review.'
        : 'Please contact NWRMA with the requested information as soon as possible.',
    ],
    approved: [
      `Your Water Right application (${base.reference}) for ${base.organisationName} has been approved.`,
      'NWRMA will contact you regarding permit issuance and any remaining administrative steps.',
    ],
    rejected: [
      `After review, your Water Right application (${base.reference}) for ${base.organisationName} has not been approved at this time.`,
    ],
  }
  await sendLicenseEmail(base, subjects[status], bodies[status])
}

export async function sendLicenseApplicationReceivedEmail(base: LicenseEmailBase): Promise<void> {
  await sendLicenseEmail(
    base,
    `NWRMA: Drilling licence application received — ${base.reference}`,
    [
      `Thank you. We have received your application for a water drilling licence for ${base.organisationName}.`,
      'NWRMA will review your submission and contact you if additional information is required.',
      'Average processing time is within two (2) months from the date of receipt, provided the application is complete.',
    ]
  )
}

export async function sendLicenseAdditionalInfoEmail(base: LicenseEmailBase): Promise<void> {
  await sendLicenseEmail(
    base,
    `NWRMA: Additional information required — ${base.reference}`,
    [
      `We are reviewing your application (${base.reference}) for ${base.organisationName}.`,
      'Additional information is required before we can continue processing.',
      base.amendUrl
        ? 'Open your application using the button below, complete the missing sections in the same form format, and resubmit for review.'
        : 'Please contact NWRMA with the requested information as soon as possible.',
    ]
  )
}

export async function sendLicenseSiteInspectionEmail(
  base: LicenseEmailBase & { inspectionDate: string; inspectionNotes?: string | null }
): Promise<void> {
  const dateLabel = base.inspectionDate
  const notes = base.inspectionNotes?.trim()
  await sendLicenseEmail(
    base,
    `NWRMA: Site inspection scheduled — ${base.reference}`,
    [
      `A site inspection has been scheduled for ${base.organisationName} on ${dateLabel}.`,
      'The inspection will assess the adequacy and condition of your drilling rigs, support vehicles, and related equipment.',
      'Following the inspection, NWRMA will prepare a technical report with recommendations on your suitability for a drilling licence.',
      notes ? `Instructions: ${notes}` : '',
    ].filter(Boolean)
  )
}

export async function sendLicenseApprovedEmail(base: LicenseEmailBase): Promise<void> {
  await sendLicenseEmail(
    base,
    `NWRMA: Drilling licence approved — ${base.reference}`,
    [
      `Your borehole drilling licence application (${base.reference}) for ${base.organisationName} has been approved.`,
      'NWRMA will contact you regarding licence issuance and any remaining administrative steps.',
    ]
  )
}

export async function sendLicenseRejectedEmail(base: LicenseEmailBase): Promise<void> {
  await sendLicenseEmail(
    base,
    `NWRMA: Drilling licence application outcome — ${base.reference}`,
    [
      `After review, your drilling licence application (${base.reference}) for ${base.organisationName} has not been approved at this time.`,
      'If you have questions about this decision, please contact NWRMA.',
    ]
  )
}

export type PaymentIntakeEmailBase = {
  to: string
  contactName: string
  organisationName: string
  formTitle: string
  intakeReference: string
  financeReceiptNumber?: string | null
  reviewNote?: string | null
  resumeUrl?: string
  attachments?: MailAttachment[]
}

export async function sendPaymentVerifiedResumeEmail(base: PaymentIntakeEmailBase): Promise<void> {
  const resumeUrl = base.resumeUrl?.trim() ?? ''
  const greeting = `Hello ${base.contactName || 'Applicant'},`
  const text = [
    greeting,
    '',
    `Your administrative fee payment for "${base.formTitle}" (${base.intakeReference}) has been verified by NWRMA Finance.`,
    base.financeReceiptNumber
      ? `Official receipt number: ${base.financeReceiptNumber} (this number is pre-filled on your application form).`
      : '',
    '',
    'You may now continue and complete your application using the link below:',
    resumeUrl,
    '',
    'A PDF payment verification receipt (Sierra Leone official colours) is attached to this email.',
    '',
    `Organisation: ${base.organisationName}`,
    '',
    'This link is personal, works only once, and expires after a limited time. Complete the form in the same browser after opening it. If it has been used or expired, contact NWRMA Finance.',
    '',
    'National Water Resources Management Agency — Sierra Leone',
    'https://nwrma.gov.sl',
  ]
    .filter(Boolean)
    .join('\n')

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;max-width:560px;">
  <p>Hello <strong>${escapeHtml(base.contactName)}</strong>,</p>
  <p>Your administrative fee payment for <strong>${escapeHtml(base.formTitle)}</strong>
     (<strong>${escapeHtml(base.intakeReference)}</strong>) has been <strong>verified</strong> by NWRMA Finance.</p>
  <p>You may now continue and complete your application:</p>
  <p style="margin:20px 0;">
    <a href="${escapeHtml(resumeUrl)}" style="display:inline-block;padding:12px 20px;background:#0072C6;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
      Continue application
    </a>
  </p>
  <p style="font-size:13px;color:#555;">Your official <strong>payment verification receipt</strong> is attached as a PDF (green, white and blue — Sierra Leone colours).</p>
  <p style="font-size:13px;color:#555;">
    ${base.financeReceiptNumber ? `<strong>Official receipt number:</strong> ${escapeHtml(base.financeReceiptNumber)}<br/>` : ''}
    <strong>Payment reference:</strong> ${escapeHtml(base.intakeReference)}<br/>
    <strong>Organisation:</strong> ${escapeHtml(base.organisationName)}
  </p>
  <p style="font-size:12px;color:#777;">Open this link, then click <strong>Continue application</strong> on the page to start your form. The link is personal and expires after a limited time.</p>
  <p style="font-size:13px;color:#777;margin-top:24px;">National Water Resources Management Agency — Sierra Leone</p>
</body>
</html>`

  await sendMailMessage({
    to: base.to,
    subject: `NWRMA: Payment verified — continue your ${base.formTitle}`,
    text,
    html,
    attachments: base.attachments,
  })
}

export async function sendPaymentRejectedEmail(base: PaymentIntakeEmailBase): Promise<void> {
  const note = base.reviewNote?.trim() ?? 'No additional details were provided.'
  const greeting = `Hello ${base.contactName || 'Applicant'},`
  const text = [
    greeting,
    '',
    `We could not verify the administrative fee payment for "${base.formTitle}" (${base.intakeReference}).`,
    '',
    'Message from NWRMA Finance:',
    note,
    '',
    'To apply again, return to the Online Forms page on the NWRMA website and start a new submission with a valid bank receipt.',
    '',
    `Organisation: ${base.organisationName}`,
    '',
    'National Water Resources Management Agency — Sierra Leone',
    'https://nwrma.gov.sl',
  ].join('\n')

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;max-width:560px;">
  <p>Hello <strong>${escapeHtml(base.contactName)}</strong>,</p>
  <p>We could not verify the administrative fee payment for
     <strong>${escapeHtml(base.formTitle)}</strong> (<strong>${escapeHtml(base.intakeReference)}</strong>).</p>
  <p style="margin-top:16px;padding:12px;background:#fef2f2;border-radius:8px;border-left:4px solid #dc2626;">
    <strong>Message from NWRMA Finance:</strong><br/>${escapeHtml(note)}
  </p>
  <p>To apply again, return to the <strong>Online Forms</strong> page on the NWRMA website and start a new submission with a valid bank receipt.</p>
  <p style="font-size:13px;color:#555;margin-top:20px;">
    <strong>Reference:</strong> ${escapeHtml(base.intakeReference)}<br/>
    <strong>Organisation:</strong> ${escapeHtml(base.organisationName)}
  </p>
  <p style="font-size:13px;color:#777;margin-top:24px;">National Water Resources Management Agency — Sierra Leone</p>
</body>
</html>`

  await sendMailMessage({
    to: base.to,
    subject: `NWRMA: Payment receipt not verified — ${base.intakeReference}`,
    text,
    html,
  })
}

export async function sendBirthdayGreetingEmail(params: {
  to: string
  employeeName: string
}): Promise<void> {
  const name = params.employeeName.trim() || 'Colleague'
  const subject = `Happy Birthday, ${name}! — NWRMA`
  const text = [
    `Dear ${name},`,
    '',
    'Happy Birthday from everyone at the National Water Resources Management Agency!',
    'We appreciate your dedication and wish you a wonderful day.',
    '',
    'Warm regards,',
    'HR & Admin — NWRMA',
  ].join('\n')
  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#333;">
  <p>Dear ${escapeHtml(name)},</p>
  <p>Happy Birthday from everyone at the <strong>National Water Resources Management Agency</strong>!</p>
  <p>We appreciate your dedication and wish you a wonderful day.</p>
  <p style="color:#777;font-size:13px;">Warm regards,<br/>HR &amp; Admin — NWRMA</p>
</body></html>`
  await sendMailMessage({ to: params.to, subject, text, html })
}

type WaterTestingEmailBase = {
  to: string
  contactName: string
  reference: string
  organisation: string
  siteAddress: string
  testsRequested: string[]
}

async function sendWaterTestingEmail(
  base: WaterTestingEmailBase,
  subject: string,
  bodyParagraphs: string[],
  extraHtml?: string,
): Promise<void> {
  const testsList = base.testsRequested.length
    ? base.testsRequested.join(', ')
    : 'As requested'
  const greeting = `Hello ${base.contactName || 'Applicant'},`
  const text = [
    greeting,
    '',
    ...bodyParagraphs,
    '',
    `Reference: ${base.reference}`,
    `Organisation: ${base.organisation}`,
    `Site: ${base.siteAddress}`,
    `Tests: ${testsList}`,
    '',
    'National Water Resources Management Agency — Sierra Leone',
    'https://nwrma.gov.sl',
  ].join('\n')

  const htmlBody = bodyParagraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('')
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;max-width:560px;">
  <p>Hello <strong>${escapeHtml(base.contactName)}</strong>,</p>
  ${htmlBody}
  ${extraHtml ?? ''}
  <p style="font-size:13px;color:#555;margin-top:20px;">
    <strong>Reference:</strong> ${escapeHtml(base.reference)}<br/>
    <strong>Organisation:</strong> ${escapeHtml(base.organisation)}<br/>
    <strong>Site:</strong> ${escapeHtml(base.siteAddress)}<br/>
    <strong>Tests:</strong> ${escapeHtml(testsList)}
  </p>
  <p style="font-size:13px;color:#777;margin-top:24px;">National Water Resources Management Agency — Sierra Leone</p>
</body>
</html>`

  await sendMailMessage({ to: base.to, subject, text, html })
}

export async function sendWaterTestingReceivedEmail(
  base: WaterTestingEmailBase,
): Promise<void> {
  await sendWaterTestingEmail(
    base,
    `NWRMA: Water testing request received — ${base.reference}`,
    [
      'Thank you for your water testing request.',
      'We have received your submission and it is now in our queue.',
      'Our Hydrological Services team will contact you when sample collection is scheduled.',
    ],
  )
}

export async function sendWaterTestingCollectionScheduledEmail(
  base: WaterTestingEmailBase & { scheduledAt: Date },
): Promise<void> {
  const when = base.scheduledAt.toLocaleString('en-GB', {
    dateStyle: 'full',
    timeStyle: 'short',
  })
  await sendWaterTestingEmail(
    base,
    `NWRMA: Sample collection scheduled — ${base.reference}`,
    [
      'Your water sample collection has been scheduled.',
      `Our team plans to collect the sample on: ${when}.`,
      'Please ensure site access is available at the address provided.',
    ],
    `<p style="padding:12px;background:#f0f7ff;border-radius:8px;"><strong>Scheduled:</strong> ${escapeHtml(when)}</p>`,
  )
}

export async function sendWaterTestingCompletedEmail(
  base: WaterTestingEmailBase & {
    results: Record<string, unknown>
    reportNotes?: string | null
  },
): Promise<void> {
  const rows = Object.entries(base.results)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;"><strong>${escapeHtml(k)}</strong></td><td style="padding:6px 12px;border-bottom:1px solid #eee;">${escapeHtml(String(v))}</td></tr>`,
    )
    .join('')
  const table =
    rows.length > 0
      ? `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">${rows}</table>`
      : ''
  const noteBlock = base.reportNotes?.trim()
    ? `<p style="margin-top:12px;padding:12px;background:#f4f6f8;border-radius:8px;"><strong>Laboratory notes:</strong><br/>${escapeHtml(base.reportNotes.trim())}</p>`
    : ''

  await sendWaterTestingEmail(
    base,
    `NWRMA: Water testing results — ${base.reference}`,
    [
      'Your water testing has been completed.',
      'Please find your results below. Contact NWRMA if you have any questions.',
    ],
    `${table}${noteBlock}`,
  )
}

export async function sendWaterTestingStaffAlertEmail(params: {
  reference: string
  requesterName: string
  requesterEmail: string
  organisation: string
}): Promise<void> {
  const notifyTo = process.env.SMTP_NOTIFY_TO?.trim()
  if (!notifyTo) return

  const subject = `NWRMA ERP: New water testing request — ${params.reference}`
  const text = [
    'A new water testing request was submitted via the public API.',
    '',
    `Reference: ${params.reference}`,
    `Requester: ${params.requesterName}`,
    `Email: ${params.requesterEmail}`,
    `Organisation: ${params.organisation}`,
  ].join('\n')
  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;">
  <p>A new <strong>water testing</strong> request was submitted.</p>
  <ul>
    <li><strong>Reference:</strong> ${escapeHtml(params.reference)}</li>
    <li><strong>Requester:</strong> ${escapeHtml(params.requesterName)}</li>
    <li><strong>Email:</strong> ${escapeHtml(params.requesterEmail)}</li>
    <li><strong>Organisation:</strong> ${escapeHtml(params.organisation)}</li>
  </ul>
</body></html>`
  await sendMailMessage({ to: notifyTo, subject, text, html })
}

export async function sendSubscriptionRenewalReminderEmail(params: {
  to: string
  subscriptionName: string
  vendor: string
  expiresAt: string
  daysLeft: number
}): Promise<void> {
  const subject = `Renewal reminder: ${params.subscriptionName} — ${params.daysLeft} day(s) left`
  const text = [
    `Subscription "${params.subscriptionName}" (${params.vendor}) expires on ${params.expiresAt}.`,
    `${params.daysLeft} day(s) remaining. Please arrange renewal with HR & Admin.`,
    '',
    'NWRMA ERP — HR & Admin',
  ].join('\n')
  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#333;">
  <p>Subscription <strong>${escapeHtml(params.subscriptionName)}</strong> (${escapeHtml(params.vendor)}) expires on <strong>${escapeHtml(params.expiresAt)}</strong>.</p>
  <p>${params.daysLeft} day(s) remaining. Please arrange renewal with HR &amp; Admin.</p>
  <p style="color:#777;font-size:13px;">NWRMA ERP — HR &amp; Admin</p>
</body></html>`
  await sendMailMessage({ to: params.to, subject, text, html })
}
