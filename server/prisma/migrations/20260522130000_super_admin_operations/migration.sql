-- Super Admin: licenses, borehole extensions, documents, field sync

CREATE TABLE IF NOT EXISTS "license_applications" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "applicant_name" TEXT NOT NULL DEFAULT '',
    "applicant_email" TEXT NOT NULL DEFAULT '',
    "organisation_name" TEXT NOT NULL DEFAULT '',
    "company_name" TEXT NOT NULL DEFAULT '',
    "district" TEXT NOT NULL DEFAULT '',
    "payment_status" TEXT NOT NULL DEFAULT 'unpaid',
    "inspector_user_id" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "submitted_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "license_applications_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "license_applications_reference_key" ON "license_applications"("reference");
CREATE INDEX IF NOT EXISTS "license_applications_status_idx" ON "license_applications"("status");

CREATE TABLE IF NOT EXISTS "license_workflow_events" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "actor_id" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "license_workflow_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "license_workflow_events_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "license_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "license_workflow_events_application_id_idx" ON "license_workflow_events"("application_id");

CREATE TABLE IF NOT EXISTS "license_internal_comments" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "author_id" TEXT,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "license_internal_comments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "license_internal_comments_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "license_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "license_compliance_notes" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "author_id" TEXT,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "license_compliance_notes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "license_compliance_notes_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "license_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE "boreholes" ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3);
ALTER TABLE "boreholes" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
ALTER TABLE "boreholes" ADD COLUMN IF NOT EXISTS "functional_state" TEXT;
ALTER TABLE "boreholes" ADD COLUMN IF NOT EXISTS "license_status" TEXT;

CREATE TABLE IF NOT EXISTS "borehole_history" (
    "id" TEXT NOT NULL,
    "borehole_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "event_type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "borehole_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "borehole_history_borehole_id_idx" ON "borehole_history"("borehole_id");

CREATE TABLE IF NOT EXISTS "borehole_merge_log" (
    "id" TEXT NOT NULL,
    "source_borehole_id" TEXT NOT NULL,
    "target_borehole_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "borehole_merge_log_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "platform_documents" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT,
    "size_bytes" BIGINT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "expires_at" TIMESTAMP(3),
    "signature_meta" JSONB,
    "uploaded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "platform_documents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "platform_documents_entity_idx" ON "platform_documents"("entity_type", "entity_id");

CREATE TABLE IF NOT EXISTS "platform_document_versions" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_document_versions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "platform_document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "platform_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "document_ocr_jobs" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "result" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_ocr_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "field_sync_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "device_id" TEXT,
    "payload_hash" TEXT,
    "gps_lat" DOUBLE PRECISION,
    "gps_lng" DOUBLE PRECISION,
    "accuracy_m" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'success',
    "error_message" TEXT,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "field_sync_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "field_sync_logs_user_id_idx" ON "field_sync_logs"("user_id");
CREATE INDEX IF NOT EXISTS "field_sync_logs_synced_at_idx" ON "field_sync_logs"("synced_at");

CREATE TABLE IF NOT EXISTS "field_tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "assignee_user_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "due_at" TIMESTAMP(3),
    "borehole_id" TEXT,
    "license_application_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "field_tasks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "field_tasks_assignee_idx" ON "field_tasks"("assignee_user_id");
