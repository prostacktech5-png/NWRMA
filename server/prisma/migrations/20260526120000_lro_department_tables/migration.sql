-- Legal, Regulations & Outreach (compliance department) operational tables.

CREATE TABLE IF NOT EXISTS "lro_compliance_cases" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "entity_name" TEXT NOT NULL,
    "violation_type" TEXT NOT NULL,
    "workstream" TEXT NOT NULL DEFAULT '',
    "plan_year" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'open',
    "enforcement_stage" TEXT NOT NULL DEFAULT 'none',
    "assigned_officer" TEXT NOT NULL DEFAULT '',
    "due_date" DATE,
    "notes" TEXT NOT NULL DEFAULT '',
    "license_reference" TEXT,
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "lro_compliance_cases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "lro_compliance_cases_reference_key" ON "lro_compliance_cases"("reference");

CREATE TABLE IF NOT EXISTS "lro_legal_matters" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "matter_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "summary" TEXT NOT NULL DEFAULT '',
    "license_reference" TEXT,
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "lro_legal_matters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "lro_communications_campaigns" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT '',
    "theme" TEXT NOT NULL DEFAULT 'awareness',
    "status" TEXT NOT NULL DEFAULT 'planned',
    "start_date" DATE,
    "end_date" DATE,
    "notes" TEXT NOT NULL DEFAULT '',
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "lro_communications_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "lro_regulation_refs" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "external_url" TEXT,
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "lro_regulation_refs_pkey" PRIMARY KEY ("id")
);
