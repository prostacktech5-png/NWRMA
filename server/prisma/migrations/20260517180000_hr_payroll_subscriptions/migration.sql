-- HR Phase 2: payroll runs, subscriptions, notification log

CREATE TABLE IF NOT EXISTS "hr_payroll_runs" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "default_tax_rate_pct" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "notes" TEXT NOT NULL DEFAULT '',
    "submitted_at" TIMESTAMPTZ(6),
    "hr_approved_at" TIMESTAMPTZ(6),
    "hr_approved_by" TEXT,
    "finance_approved_at" TIMESTAMPTZ(6),
    "finance_approved_by" TEXT,
    "disbursed_at" TIMESTAMPTZ(6),
    "disbursed_by" TEXT,
    "rejected_at" TIMESTAMPTZ(6),
    "rejected_by" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "hr_payroll_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "hr_payroll_runs_period_idx" ON "hr_payroll_runs"("period");
CREATE INDEX IF NOT EXISTS "hr_payroll_runs_status_idx" ON "hr_payroll_runs"("status");

CREATE TABLE IF NOT EXISTS "hr_payroll_lines" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "line_type" TEXT NOT NULL DEFAULT 'salary',
    "gross" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "allowances" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtime_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "net" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "hr_payroll_lines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "hr_payroll_lines_run_id_idx" ON "hr_payroll_lines"("run_id");
CREATE INDEX IF NOT EXISTS "hr_payroll_lines_employee_id_idx" ON "hr_payroll_lines"("employee_id");

CREATE TABLE IF NOT EXISTS "hr_subscriptions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subscription_type" TEXT NOT NULL DEFAULT 'software',
    "vendor" TEXT NOT NULL DEFAULT '',
    "account_ref" TEXT NOT NULL DEFAULT '',
    "cost" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'SLE',
    "expires_at" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "reminder_days" INTEGER NOT NULL DEFAULT 30,
    "last_reminder_at" TIMESTAMPTZ(6),
    "notes" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "hr_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "hr_subscriptions_expires_at_idx" ON "hr_subscriptions"("expires_at");
CREATE INDEX IF NOT EXISTS "hr_subscriptions_status_idx" ON "hr_subscriptions"("status");

CREATE TABLE IF NOT EXISTS "hr_notification_log" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "recipient" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "hr_notification_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "hr_notification_log_entity_idx" ON "hr_notification_log"("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "hr_notification_log_sent_at_idx" ON "hr_notification_log"("sent_at");
