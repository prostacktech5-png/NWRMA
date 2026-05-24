-- Fine-grained Hydrological module visibility for staff (JSON map of flags).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hydroNavAccess" JSONB;
