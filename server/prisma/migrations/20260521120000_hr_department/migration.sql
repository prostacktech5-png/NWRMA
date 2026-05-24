-- HR department: staff, assets, audit (authoritative Postgres store)

CREATE TABLE IF NOT EXISTS "hr_employees" (
    "id" TEXT NOT NULL,
    "employee_number" TEXT NOT NULL,
    "user_id" TEXT,
    "full_name" TEXT NOT NULL,
    "department" TEXT,
    "role_title" TEXT NOT NULL DEFAULT '',
    "employment_type" TEXT NOT NULL DEFAULT 'employee',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "date_of_birth" DATE,
    "employment_status" TEXT NOT NULL DEFAULT 'active',
    "salary_amount" DOUBLE PRECISION,
    "salary_currency" TEXT NOT NULL DEFAULT 'SLE',
    "stipend_amount" DOUBLE PRECISION,
    "emergency_contact" JSONB,
    "national_id" TEXT,
    "profile_image_url" TEXT,
    "hired_at" DATE,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "hr_employees_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "hr_employees_employee_number_key" ON "hr_employees"("employee_number");
CREATE INDEX IF NOT EXISTS "hr_employees_department_idx" ON "hr_employees"("department");
CREATE INDEX IF NOT EXISTS "hr_employees_status_idx" ON "hr_employees"("employment_status");

CREATE TABLE IF NOT EXISTS "hr_employee_documents" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "doc_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "storage_key" TEXT,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "hr_employee_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "hr_employee_documents_employee_id_idx" ON "hr_employee_documents"("employee_id");

CREATE TABLE IF NOT EXISTS "hr_assets" (
    "id" TEXT NOT NULL,
    "asset_tag" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "serial_number" TEXT,
    "condition" TEXT NOT NULL DEFAULT 'good',
    "warranty_expiry" DATE,
    "location" TEXT NOT NULL DEFAULT '',
    "acquired_at" DATE,
    "cost" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'in_storage',
    "custodian_employee_id" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "hr_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "hr_assets_asset_tag_key" ON "hr_assets"("asset_tag");
CREATE INDEX IF NOT EXISTS "hr_assets_custodian_idx" ON "hr_assets"("custodian_employee_id");

CREATE TABLE IF NOT EXISTS "hr_asset_assignments" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returned_at" TIMESTAMPTZ(6),
    "notes" TEXT NOT NULL DEFAULT '',
    "condition_at_assign" TEXT,
    "condition_at_return" TEXT,
    CONSTRAINT "hr_asset_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "hr_asset_assignments_asset_id_idx" ON "hr_asset_assignments"("asset_id");
CREATE INDEX IF NOT EXISTS "hr_asset_assignments_employee_id_idx" ON "hr_asset_assignments"("employee_id");

CREATE TABLE IF NOT EXISTS "hr_audit_log" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "hr_audit_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "hr_audit_log_entity_idx" ON "hr_audit_log"("entity_type", "entity_id");
