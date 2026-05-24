-- Super Admin: GIS, water quality, notifications, API, backup, validation, MFA

CREATE TABLE IF NOT EXISTS "gis_layers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "layer_type" TEXT NOT NULL DEFAULT 'geojson',
    "storage_key" TEXT,
    "url" TEXT,
    "z_index" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "gis_layers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "water_quality_tests" (
    "id" TEXT NOT NULL,
    "borehole_id" TEXT,
    "lab_reference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "parameters" JSONB NOT NULL DEFAULT '{}',
    "approved_by" TEXT,
    "flagged_at" TIMESTAMP(3),
    "tested_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "water_quality_tests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "water_quality_tests_borehole_id_idx" ON "water_quality_tests"("borehole_id");
CREATE INDEX IF NOT EXISTS "water_quality_tests_status_idx" ON "water_quality_tests"("status");

CREATE TABLE IF NOT EXISTS "water_quality_thresholds" (
    "id" TEXT NOT NULL,
    "parameter" TEXT NOT NULL,
    "min_value" DOUBLE PRECISION,
    "max_value" DOUBLE PRECISION,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "water_quality_thresholds_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "water_quality_thresholds_parameter_key" ON "water_quality_thresholds"("parameter");

INSERT INTO "water_quality_thresholds" ("id", "parameter", "min_value", "max_value", "severity") VALUES
  ('wqt_ph', 'ph', 6.5, 8.5, 'warning'),
  ('wqt_turbidity', 'turbidity', NULL, 5, 'warning'),
  ('wqt_iron', 'iron', NULL, 0.3, 'warning'),
  ('wqt_fluoride', 'fluoride', NULL, 1.5, 'warning'),
  ('wqt_salinity', 'salinity', NULL, 1000, 'warning'),
  ('wqt_conductivity', 'conductivity', NULL, 1500, 'warning'),
  ('wqt_nitrate', 'nitrate', NULL, 50, 'warning'),
  ('wqt_arsenic', 'arsenic', NULL, 0.01, 'critical'),
  ('wqt_bacteria', 'bacteria', NULL, 0, 'critical'),
  ('wqt_temperature', 'temperature', 15, 35, 'warning')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS "platform_alerts" (
    "id" TEXT NOT NULL,
    "alert_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "acknowledged_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_alerts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "platform_alerts_created_at_idx" ON "platform_alerts"("created_at");

CREATE TABLE IF NOT EXISTS "notification_templates" (
    "id" TEXT NOT NULL,
    "trigger_key" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "notification_templates_trigger_channel_key" ON "notification_templates"("trigger_key", "channel");

CREATE TABLE IF NOT EXISTS "notification_outbox" (
    "id" TEXT NOT NULL,
    "template_id" TEXT,
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sent_at" TIMESTAMP(3),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_outbox_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "workflow_definitions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "definition" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "workflow_definitions_code_key" ON "workflow_definitions"("code");

CREATE TABLE IF NOT EXISTS "api_keys" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "scopes" JSONB NOT NULL DEFAULT '[]',
    "rate_limit_per_min" INTEGER NOT NULL DEFAULT 60,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "webhook_endpoints" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret_hash" TEXT,
    "events" JSONB NOT NULL DEFAULT '[]',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "integration_logs" (
    "id" TEXT NOT NULL,
    "integration" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payload_summary" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "integration_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "integration_logs_created_at_idx" ON "integration_logs"("created_at");

CREATE TABLE IF NOT EXISTS "backup_runs" (
    "id" TEXT NOT NULL,
    "backup_type" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'running',
    "size_bytes" BIGINT,
    "storage_path" TEXT,
    "error" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "backup_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "report_jobs" (
    "id" TEXT NOT NULL,
    "report_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "parameters" JSONB,
    "output_path" TEXT,
    "requested_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "report_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "validation_findings" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "score" DOUBLE PRECISION,
    "payload" JSONB,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "validation_findings_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "validation_findings_entity_idx" ON "validation_findings"("entity_type", "entity_id");

CREATE TABLE IF NOT EXISTS "password_policies" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "min_length" INTEGER NOT NULL DEFAULT 10,
    "require_uppercase" BOOLEAN NOT NULL DEFAULT true,
    "require_lowercase" BOOLEAN NOT NULL DEFAULT true,
    "require_number" BOOLEAN NOT NULL DEFAULT true,
    "require_special" BOOLEAN NOT NULL DEFAULT false,
    "rotation_days" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_policies_pkey" PRIMARY KEY ("id")
);

INSERT INTO "password_policies" ("id") VALUES ('default') ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS "platform_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("key")
);
