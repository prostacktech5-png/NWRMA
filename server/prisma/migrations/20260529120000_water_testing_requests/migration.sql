CREATE TABLE IF NOT EXISTS "water_testing_requests" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "public_case_id" TEXT,
    "requester_name" TEXT NOT NULL,
    "requester_email" TEXT NOT NULL,
    "requester_phone" TEXT,
    "organisation" TEXT NOT NULL,
    "site_address" TEXT NOT NULL,
    "tests_requested" JSONB NOT NULL DEFAULT '[]',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'received',
    "notes" TEXT,
    "assigned_to_user_id" TEXT,
    "assigned_to_name" TEXT,
    "sample_collection_scheduled_at" TIMESTAMP(3),
    "results" JSONB,
    "report_notes" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "last_email_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "water_testing_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "water_testing_requests_reference_key" ON "water_testing_requests"("reference");
CREATE INDEX IF NOT EXISTS "water_testing_requests_status_idx" ON "water_testing_requests"("status");
CREATE INDEX IF NOT EXISTS "water_testing_requests_requester_email_idx" ON "water_testing_requests"("requester_email");
CREATE INDEX IF NOT EXISTS "water_testing_requests_received_at_idx" ON "water_testing_requests"("received_at" DESC);
