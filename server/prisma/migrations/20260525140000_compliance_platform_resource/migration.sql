-- Platform RBAC resource for Legal, Regulations & Outreach (compliance department).

INSERT INTO "platform_permissions" ("id", "resource", "action")
SELECT 'perm_compliance_' || a, 'compliance', a
FROM (VALUES
  ('create'), ('read'), ('update'), ('delete'), ('approve'), ('export'),
  ('manage_settings'), ('manage_users'), ('manage_gis'), ('manage_payments')
) AS actions(a)
ON CONFLICT DO NOTHING;

INSERT INTO "platform_role_permissions" ("role_id", "permission_id")
SELECT 'role_super_admin', p.id FROM "platform_permissions" p
WHERE p.resource = 'compliance'
ON CONFLICT DO NOTHING;
