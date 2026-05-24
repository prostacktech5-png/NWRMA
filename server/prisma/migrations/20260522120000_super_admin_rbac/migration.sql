-- Super Admin: RBAC, audit, user security, sessions

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "must_change_password" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "locked_until" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "failed_login_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfa_secret" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "User_status_idx" ON "User"("status");
CREATE INDEX IF NOT EXISTS "User_deleted_at_idx" ON "User"("deleted_at");

CREATE TABLE IF NOT EXISTS "platform_roles" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_roles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "platform_roles_code_key" ON "platform_roles"("code");

CREATE TABLE IF NOT EXISTS "platform_permissions" (
    "id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    CONSTRAINT "platform_permissions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "platform_permissions_resource_action_key" ON "platform_permissions"("resource", "action");

CREATE TABLE IF NOT EXISTS "platform_role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    CONSTRAINT "platform_role_permissions_pkey" PRIMARY KEY ("role_id", "permission_id"),
    CONSTRAINT "platform_role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "platform_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "platform_role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "platform_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "user_platform_roles" (
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_platform_roles_pkey" PRIMARY KEY ("user_id", "role_id"),
    CONSTRAINT "user_platform_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_platform_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "platform_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "user_platform_roles_user_id_idx" ON "user_platform_roles"("user_id");

CREATE TABLE IF NOT EXISTS "user_geo_scopes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "region_id" TEXT,
    "district_id" TEXT,
    "chiefdom_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_geo_scopes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_geo_scopes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "user_geo_scopes_user_id_idx" ON "user_geo_scopes"("user_id");

CREATE TABLE IF NOT EXISTS "user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "user_sessions_user_id_idx" ON "user_sessions"("user_id");
CREATE INDEX IF NOT EXISTS "user_sessions_token_hash_idx" ON "user_sessions"("token_hash");

CREATE TABLE IF NOT EXISTS "user_login_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "email_attempt" TEXT,
    "success" BOOLEAN NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_login_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "user_login_events_user_id_idx" ON "user_login_events"("user_id");
CREATE INDEX IF NOT EXISTS "user_login_events_created_at_idx" ON "user_login_events"("created_at");

CREATE TABLE IF NOT EXISTS "user_devices" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "label" TEXT,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_devices_user_fingerprint_key" ON "user_devices"("user_id", "fingerprint");

CREATE TABLE IF NOT EXISTS "platform_audit_log" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "field_name" TEXT,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_audit_log_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "platform_audit_log_entity_idx" ON "platform_audit_log"("entity_type", "entity_id", "created_at");
CREATE INDEX IF NOT EXISTS "platform_audit_log_actor_idx" ON "platform_audit_log"("actor_id", "created_at");

-- Seed system roles
INSERT INTO "platform_roles" ("id", "code", "name", "description", "is_system") VALUES
  ('role_super_admin', 'super_admin', 'Super Admin', 'Full platform control', true),
  ('role_admin', 'admin', 'Admin', 'Organization administrator', true),
  ('role_regional_manager', 'regional_manager', 'Regional Manager', 'Regional oversight', true),
  ('role_district_officer', 'district_officer', 'District Officer', 'District-level operations', true),
  ('role_field_officer', 'field_officer', 'Field Officer', 'Field data collection', true),
  ('role_data_entry_clerk', 'data_entry_clerk', 'Data Entry Clerk', 'Data entry', true),
  ('role_gis_officer', 'gis_officer', 'GIS Officer', 'GIS administration', true),
  ('role_water_quality_officer', 'water_quality_officer', 'Water Quality Officer', 'Lab and water quality', true),
  ('role_finance_officer', 'finance_officer', 'Finance Officer', 'Finance and payments', true),
  ('role_read_only_auditor', 'read_only_auditor', 'Read-only Auditor', 'Audit read access', true)
ON CONFLICT DO NOTHING;

-- Seed permissions (resource x action)
INSERT INTO "platform_permissions" ("id", "resource", "action")
SELECT 'perm_' || r || '_' || a, r, a
FROM (VALUES
  ('boreholes'), ('licenses'), ('users'), ('gis'), ('water_quality'), ('field_ops'),
  ('documents'), ('finance'), ('notifications'), ('system'), ('audit'), ('api'), ('reports'), ('backup')
) AS resources(r),
(VALUES
  ('create'), ('read'), ('update'), ('delete'), ('approve'), ('export'),
  ('manage_settings'), ('manage_users'), ('manage_gis'), ('manage_payments')
) AS actions(a)
ON CONFLICT DO NOTHING;

-- Super admin gets all permissions
INSERT INTO "platform_role_permissions" ("role_id", "permission_id")
SELECT 'role_super_admin', p.id FROM "platform_permissions" p
ON CONFLICT DO NOTHING;

-- Read-only auditor: read + export on most resources
INSERT INTO "platform_role_permissions" ("role_id", "permission_id")
SELECT 'role_read_only_auditor', p.id FROM "platform_permissions" p
WHERE p.action IN ('read', 'export')
ON CONFLICT DO NOTHING;
