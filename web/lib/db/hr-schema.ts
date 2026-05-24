import { getSql } from '@/lib/db'

let ensurePromise: Promise<void> | null = null

/** Creates HR tables if missing (matches server migration 20260521120000_hr_department). */
export async function ensureHrSchema(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = runEnsure().catch((e) => {
      ensurePromise = null
      throw e
    })
  }
  return ensurePromise
}

async function runEnsure(): Promise<void> {
  const sql = getSql()
  await sql`
    CREATE TABLE IF NOT EXISTS hr_employees (
      id TEXT PRIMARY KEY,
      employee_number TEXT NOT NULL UNIQUE,
      user_id TEXT,
      full_name TEXT NOT NULL,
      department TEXT,
      role_title TEXT NOT NULL DEFAULT '',
      employment_type TEXT NOT NULL DEFAULT 'employee',
      phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      date_of_birth DATE,
      employment_status TEXT NOT NULL DEFAULT 'active',
      salary_amount DOUBLE PRECISION,
      salary_currency TEXT NOT NULL DEFAULT 'SLE',
      stipend_amount DOUBLE PRECISION,
      emergency_contact JSONB,
      national_id TEXT,
      profile_image_url TEXT,
      hired_at DATE,
      archived_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS hr_employee_documents (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      doc_type TEXT NOT NULL,
      name TEXT NOT NULL,
      storage_key TEXT,
      mime_type TEXT,
      size_bytes INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS hr_assets (
      id TEXT PRIMARY KEY,
      asset_tag TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      serial_number TEXT,
      condition TEXT NOT NULL DEFAULT 'good',
      warranty_expiry DATE,
      location TEXT NOT NULL DEFAULT '',
      acquired_at DATE,
      cost DOUBLE PRECISION,
      status TEXT NOT NULL DEFAULT 'in_storage',
      custodian_employee_id TEXT,
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS hr_asset_assignments (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      returned_at TIMESTAMPTZ,
      notes TEXT NOT NULL DEFAULT '',
      condition_at_assign TEXT,
      condition_at_return TEXT
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS hr_audit_log (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      actor_user_id TEXT,
      payload JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS hr_payroll_runs (
      id TEXT PRIMARY KEY,
      period TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      default_tax_rate_pct DOUBLE PRECISION NOT NULL DEFAULT 15,
      notes TEXT NOT NULL DEFAULT '',
      submitted_at TIMESTAMPTZ,
      hr_approved_at TIMESTAMPTZ,
      hr_approved_by TEXT,
      finance_approved_at TIMESTAMPTZ,
      finance_approved_by TEXT,
      disbursed_at TIMESTAMPTZ,
      disbursed_by TEXT,
      rejected_at TIMESTAMPTZ,
      rejected_by TEXT,
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS hr_payroll_lines (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      line_type TEXT NOT NULL DEFAULT 'salary',
      gross DOUBLE PRECISION NOT NULL DEFAULT 0,
      allowances DOUBLE PRECISION NOT NULL DEFAULT 0,
      deductions DOUBLE PRECISION NOT NULL DEFAULT 0,
      overtime_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      tax_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      net DOUBLE PRECISION NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS hr_subscriptions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subscription_type TEXT NOT NULL DEFAULT 'software',
      vendor TEXT NOT NULL DEFAULT '',
      account_ref TEXT NOT NULL DEFAULT '',
      cost DOUBLE PRECISION,
      currency TEXT NOT NULL DEFAULT 'SLE',
      expires_at DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      reminder_days INTEGER NOT NULL DEFAULT 30,
      last_reminder_at TIMESTAMPTZ,
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS hr_notification_log (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'email',
      recipient TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'sent',
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
}
