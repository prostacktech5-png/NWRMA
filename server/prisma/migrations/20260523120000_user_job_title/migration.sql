-- ERP user job title (display on directory / super admin user management)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "job_title" TEXT;
