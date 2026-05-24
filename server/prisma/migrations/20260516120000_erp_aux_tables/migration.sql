-- Auxiliary ERP tables + JSON snapshot for modules not normalized into dedicated APIs yet.
-- Apply with: cd server && npx prisma migrate deploy (same DATABASE_URL as Next.js web).

CREATE TABLE IF NOT EXISTS "erp_reference_snapshot" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "erp_reference_snapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "gauge_officers" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "linked_user_id" TEXT,
    "field_app_key" TEXT NOT NULL,

    CONSTRAINT "gauge_officers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "hydrological_settings" (
    "id" INTEGER NOT NULL,
    "per_reading_rate_sle" DOUBLE PRECISION NOT NULL,
    "field_app_key" TEXT NOT NULL,

    CONSTRAINT "hydrological_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "water_level_readings" (
    "id" TEXT NOT NULL,
    "station_id" TEXT NOT NULL,
    "station_name" TEXT NOT NULL,
    "officer_name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "gauge_officer_id" TEXT NOT NULL,
    "hod_validation" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "measured_at" TIMESTAMP(3) NOT NULL,
    "level_m" DOUBLE PRECISION NOT NULL,
    "gps_location" TEXT NOT NULL,
    "gauge_photo_url" TEXT,
    "quality_flag" TEXT,
    "source" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "water_level_readings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "officer_payments" (
    "id" TEXT NOT NULL,
    "gauge_officer_id" TEXT NOT NULL,
    "officer_name" TEXT NOT NULL,
    "year_month" TEXT NOT NULL,
    "valid_submissions" INTEGER NOT NULL,
    "rate_sle" DOUBLE PRECISION NOT NULL,
    "total_sle" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "disbursed_at" TIMESTAMP(3),
    "approved_by_user_id" TEXT,
    "disbursed_by_user_id" TEXT,

    CONSTRAINT "officer_payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "hydro_payment_audit" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "by_user_id" TEXT NOT NULL,

    CONSTRAINT "hydro_payment_audit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "finance_budgets" (
    "id" INTEGER NOT NULL,
    "budget_code" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "project" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "utilized_amount" DOUBLE PRECISION NOT NULL,
    "fiscal_year" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_budgets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "finance_funds_receipts" (
    "id" INTEGER NOT NULL,
    "fiscal_year" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "source" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_funds_receipts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "finance_requisitions" (
    "id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "requester_email" TEXT,
    "department" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "budget_id" INTEGER NOT NULL,
    "expense_kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "approval_route" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_requisitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "leave_requests" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "employee_name" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "leave_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "approver_id" TEXT,
    "approver_name" TEXT,
    "comment" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "hydro_portal_links" (
    "kind" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hydro_portal_links_pkey" PRIMARY KEY ("kind")
);

CREATE TABLE IF NOT EXISTS "hydro_portal_requests" (
    "id" SERIAL NOT NULL,
    "kind" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "requester_email" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "hod_workflow" TEXT NOT NULL DEFAULT 'pending_hod',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hydro_portal_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "app_meta" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "app_meta_pkey" PRIMARY KEY ("key")
);
